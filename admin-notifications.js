function createAdminNotifications() {
    const sound = document.getElementById('orderSound');
    const soundButton = document.getElementById('sound-toggle');
    const pushButton = document.getElementById('push-toggle');
    const status = document.getElementById('notification-status');
    const banner = document.getElementById('new-order-signal');
    const deviceKey = 'joymouth-push-device';
    const enabledKey = 'joymouth-push-enabled';
    let soundEnabled = false;
    let pushBusy = false;

    function setPushLabel() {
        const enabled = localStorage.getItem(enabledKey) === 'yes';
        pushButton.setAttribute('aria-pressed', String(enabled));
        pushButton.textContent = enabled ? 'Вэб мэдэгдэл унтраах' : 'Утас, компьютерийн мэдэгдэл асаах';
    }

    async function configurePush(action) {
        if (pushBusy) return;
        pushBusy = true;
        pushButton.disabled = true;
        try {
            const configure = firebase.functions().httpsCallable('configureAdminPush');
            if (action === 'disable') {
                await configure({ action, deviceId: localStorage.getItem(deviceKey) });
                localStorage.removeItem(enabledKey);
                try { await firebase.messaging().deleteToken(); } catch { /* The server registration is already removed. */ }
                status.textContent = 'Энэ төхөөрөмжийн вэб мэдэгдлийг унтраалаа.';
                return;
            }

            if (!('Notification' in window) || !('serviceWorker' in navigator) || !firebase.messaging) {
                throw new Error('Энэ хөтөч вэб мэдэгдэл дэмжихгүй байна.');
            }
            const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
            if (permission !== 'granted') throw new Error('Мэдэгдлийн зөвшөөрлийг хөтчийн тохиргооноос өгнө үү.');
            if (!await firebase.messaging.isSupported()) throw new Error('Энэ хөтөч вэб мэдэгдэл дэмжихгүй байна.');
            const { data } = await configure({ action: 'config' });
            const deviceId = localStorage.getItem(deviceKey) || crypto.randomUUID();
            localStorage.setItem(deviceKey, deviceId);
            const worker = await navigator.serviceWorker.register('./firebase-messaging-sw.js', { scope: './admin.html' });
            await navigator.serviceWorker.ready;
            const token = await firebase.messaging().getToken({ vapidKey: data.vapidKey, serviceWorkerRegistration: worker });
            if (!token) throw new Error('Энэ төхөөрөмжийг бүртгэж чадсангүй.');
            await configure({ action: 'enable', deviceId, token });
            localStorage.setItem(enabledKey, 'yes');
            status.textContent = 'Энэ төхөөрөмжид вэб мэдэгдэл идэвхтэй.';
        } finally {
            pushBusy = false;
            pushButton.disabled = false;
            setPushLabel();
        }
    }

    function showPushError(error) {
        status.textContent = error.code?.startsWith('functions/')
            ? 'Вэб мэдэгдлийн Firebase тохиргоо болон админ эрхээ шалгана уу.'
            : error.message || 'Вэб мэдэгдлийг тохируулж чадсангүй.';
    }

    pushButton.addEventListener('click', () => {
        const action = localStorage.getItem(enabledKey) === 'yes' ? 'disable' : 'enable';
        configurePush(action).catch(showPushError);
    });

    soundButton.addEventListener('click', async () => {
        if (!soundEnabled) {
            try {
                await sound.play();
                soundEnabled = true;
            } catch {
                status.textContent = 'Дуу тоглуулж чадсангүй. Хөтчийн дууны тохиргоог шалгана уу.';
            }
        } else {
            sound.pause();
            sound.currentTime = 0;
            soundEnabled = false;
        }
        soundButton.setAttribute('aria-pressed', String(soundEnabled));
        soundButton.textContent = soundEnabled ? 'Дуу унтраах' : 'Дуу асаах';
    });

    return {
        refresh() {
            setPushLabel();
            if (localStorage.getItem(enabledKey) === 'yes' && window.Notification?.permission === 'granted') {
                configurePush('enable').catch(showPushError);
            }
        },
        signal(count) {
            banner.textContent = count === 1 ? 'Шинэ захиалга ирлээ' : count + ' шинэ захиалга ирлээ';
            if (soundEnabled) {
                sound.currentTime = 0;
                sound.play().catch(() => {
                    status.textContent = 'Дуу тоглуулж чадсангүй. Дууны тохиргоог шалгана уу.';
                });
            }
        },
        clear() {
            banner.textContent = '';
            status.textContent = '';
            sound.pause();
            soundEnabled = false;
            soundButton.setAttribute('aria-pressed', 'false');
            soundButton.textContent = 'Дуу асаах';
        },
        async signOut() {
            if (pushBusy) {
                status.textContent = 'Мэдэгдлийн тохиргоо хийгдэж байна. Түр хүлээнэ үү.';
                return;
            }
            let pushCleanupFailed = false;
            try {
                if (localStorage.getItem(enabledKey) === 'yes') await configurePush('disable');
            } catch {
                try {
                    await firebase.messaging().deleteToken();
                    localStorage.removeItem(enabledKey);
                } catch {
                    pushCleanupFailed = true;
                }
            }
            try {
                await firebase.auth().signOut();
                if (pushCleanupFailed) {
                    document.getElementById('admin-login-notice').textContent =
                        'Энэ төхөөрөмжийн вэб мэдэгдлийг унтрааж чадсангүй. Хөтчийн сайтын тохиргооноос мэдэгдлийг хаана уу.';
                }
            } catch {
                status.textContent = 'Гарч чадсангүй. Дахин оролдоно уу.';
            }
        },
    };
}
