const { createHash, randomUUID } = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineJsonSecret } = require('firebase-functions/params');
const { logger } = require('firebase-functions');
const { orderMessage, sendTelegram, sendWhatsApp, sendPush } = require('./providers');

initializeApp();
const db = getFirestore();
const settings = defineJsonSecret('ORDER_NOTIFICATIONS');
const devices = db.collection('_adminPushDevices');
const deliveries = db.collection('_orderNotificationDeliveries');
const orderAgeLimit = 30 * 60 * 1000;
const leaseTime = 2 * 60 * 1000;
const isAdminEmail = (config, email) => Array.isArray(config.adminEmails) && config.adminEmails.includes(email);
const invalidTokens = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);

exports.configureAdminPush = onCall({ secrets: [settings] }, async ({ auth, data }) => {
    const config = settings.value();
    if (!auth || auth.token.email_verified !== true || !isAdminEmail(config, auth.token.email)) {
        throw new HttpsError('permission-denied', 'Admin access required.');
    }
    if (!config.webPush?.vapidKey) throw new HttpsError('failed-precondition', 'Web push is not configured.');
    if (data?.action === 'config') return { vapidKey: config.webPush.vapidKey };

    const { action, deviceId, token } = data || {};
    if (typeof deviceId !== 'string' || !/^[a-f0-9-]{36}$/.test(deviceId)) {
        throw new HttpsError('invalid-argument', 'Invalid device identifier.');
    }
    const device = devices.doc(createHash('sha256').update(auth.uid + ':' + deviceId).digest('hex'));
    if (action === 'disable') {
        await device.delete();
        return { enabled: false };
    }
    if (action !== 'enable' || typeof token !== 'string' || !/^[A-Za-z0-9_:-]{30,4096}$/.test(token)) {
        throw new HttpsError('invalid-argument', 'Invalid registration.');
    }
    await device.set({ token, adminEmail: auth.token.email, updatedAt: FieldValue.serverTimestamp() });
    return { enabled: true };
});

async function deliver(orderId, destination, send) {
    const id = createHash('sha256').update(orderId + ':' + destination).digest('hex');
    const ref = deliveries.doc(id);
    const leaseId = randomUUID();
    const shouldSend = await db.runTransaction(async (transaction) => {
        const previous = (await transaction.get(ref)).data();
        if (previous?.finishedAt) return false;
        if (previous?.leaseUntil?.toMillis() > Date.now()) throw new Error('Delivery in progress');
        transaction.set(ref, {
            leaseId,
            leaseUntil: Timestamp.fromMillis(Date.now() + leaseTime),
            expiresAt: Timestamp.fromMillis(Date.now() + 7 * 86400000),
        });
        return true;
    });
    if (!shouldSend) return;

    let result = 'sent';
    try {
        await send();
    } catch (error) {
        result = error.retryable === false ? 'failed' : 'retry';
        logger.warn('Order notification delivery error', {
            orderId, channel: destination.split(':')[0], code: error.code || 'unknown', result,
        });
    }
    await db.runTransaction(async (transaction) => {
        const current = (await transaction.get(ref)).data();
        if (current?.leaseId !== leaseId) return;
        if (result === 'retry') transaction.delete(ref);
        else transaction.update(ref, { result, finishedAt: FieldValue.serverTimestamp() });
    });
    if (result === 'retry') throw new Error('Retry order notification delivery');
}

async function notifyPush(orderId, config, message) {
    const registrations = await devices.get();
    const results = await Promise.allSettled(registrations.docs
        .filter((doc) => isAdminEmail(config, doc.get('adminEmail')))
        .map((doc) => deliver(orderId, 'webpush:' + doc.id, async () => {
            try {
                await sendPush(getMessaging(), doc.get('token'), message);
            } catch (error) {
                if (!invalidTokens.has(error.code)) throw error;
                await db.runTransaction(async (transaction) => {
                    const current = await transaction.get(doc.ref);
                    if (current.get('token') === doc.get('token')) transaction.delete(doc.ref);
                });
            }
        })));
    if (results.some((result) => result.status === 'rejected')) throw new Error('Retry web push delivery');
}

exports.notifyNewOrder = onDocumentCreated({
    document: 'orders/{orderId}',
    secrets: [settings],
    retry: true,
    timeoutSeconds: 60,
}, async (event) => {
    if (!event.data || Date.now() - Date.parse(event.time) > orderAgeLimit) return;
    const config = settings.value();
    const { orderId } = event.params;
    const message = orderMessage(orderId, event.data.data(), config.adminUrl);
    const channels = [];
    if (config.telegram) channels.push(deliver(orderId, 'telegram', () => sendTelegram(config.telegram, message)));
    if (config.whatsapp) channels.push(deliver(orderId, 'whatsapp', () => sendWhatsApp(config.whatsapp, message)));
    if (config.webPush?.vapidKey) channels.push(notifyPush(orderId, config, message));
    const results = await Promise.allSettled(channels);
    if (results.some((result) => result.status === 'rejected')) throw new Error('Retry pending order notifications');
});
