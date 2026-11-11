function orderMessage(id, order, adminUrl) {
    const url = new URL(adminUrl || 'https://joy-mouth.vercel.app/admin.html');
    url.hash = 'order-' + encodeURIComponent(id);
    const total = typeof order.totalPrice === 'number' && Number.isFinite(order.totalPrice) && order.totalPrice >= 0
        ? new Intl.NumberFormat('en-US').format(order.totalPrice) + '₮'
        : 'Дүн тодорхойгүй';
    const reference = id.slice(-8);
    return { reference, total, title: 'Joy Mouth · Шинэ захиалга', body: '#' + reference + ' · ' + total, url: url.href };
}

async function post(url, payload, headers = {}) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
    });
    if (!response.ok) {
        await response.body?.cancel();
        const error = new Error('Notification provider rejected the request');
        error.code = 'http-' + response.status;
        error.retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        throw error;
    }
    await response.body?.cancel();
}

function sendTelegram(config, message) {
    if (typeof config.botToken !== 'string' || !/^\d+:[A-Za-z0-9_-]+$/.test(config.botToken)) {
        const error = new Error('Invalid Telegram bot token configuration');
        error.code = 'telegram-config';
        error.retryable = false;
        throw error;
    }
    return post('https://api.telegram.org/bot' + config.botToken + '/sendMessage', {
        chat_id: config.chatId,
        text: message.title + '\n' + message.body,
        reply_markup: { inline_keyboard: [[{ text: 'Админ дээр нээх', url: message.url }]] },
    });
}

function sendWhatsApp(config, message) {
    return post(
        'https://graph.facebook.com/' + encodeURIComponent(config.graphVersion) + '/' + encodeURIComponent(config.phoneNumberId) + '/messages',
        {
            messaging_product: 'whatsapp',
            to: config.recipient,
            type: 'template',
            template: {
                name: config.templateName,
                language: { code: config.language },
                components: [{
                    type: 'body',
                    parameters: [
                        { type: 'text', text: message.reference },
                        { type: 'text', text: message.total },
                    ],
                }],
            },
        },
        { Authorization: 'Bearer ' + config.accessToken },
    );
}

async function sendPush(messaging, token, message) {
    try {
        await messaging.send({
            token,
            notification: { title: message.title, body: message.body },
            webpush: {
                headers: { TTL: '1800' },
                notification: { icon: '/headlogo.png', tag: 'joymouth-order-' + message.reference },
                fcmOptions: { link: message.url },
            },
        });
    } catch (error) {
        error.retryable = [
            'messaging/internal-error', 'messaging/server-unavailable', 'messaging/unknown-error',
            'messaging/message-rate-exceeded', 'messaging/device-message-rate-exceeded',
        ].includes(error.code);
        throw error;
    }
}

module.exports = { orderMessage, sendTelegram, sendWhatsApp, sendPush };
