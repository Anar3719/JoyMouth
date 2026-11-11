const firebaseConfig = {
    apiKey: "AIzaSyDpVh6TB0eVPHhoXjDHfxJuMjnkYnvlwRM",
    authDomain: "joymouth-e0898.firebaseapp.com",
    projectId: "joymouth-e0898",
    storageBucket: "joymouth-e0898.firebasestorage.app",
    messagingSenderId: "716037708846",
    appId: "1:716037708846:web:22691690cb8f214cfb13bf",
    measurementId: "G-0DGDM401SN"
};

const products = [
    { name: 'Бүргер', price: 7500, image: 'burger_real.jpg', fit: 'contain' },
    { name: 'Сэндвич', price: 6500, image: 'sandwich_real.jpg' },
    { name: 'Кимбаб', price: 4500, image: 'kimbap_real.JPG', fit: 'contain' },
    { name: 'Чиабатта', price: 8000, image: 'ciabatta_real.jpg' },
];

const banks = [
    { name: 'М-Банк', image: 'bank-logo-mbank.png', account: '9800 3900 8010 0437 24' },
    { name: 'Голомт Банк', image: 'bank-logo-golomt.png', account: '8900 1500 1205 1535 49' },
    { name: 'Төрийн Банк', image: 'bank-logo-state.png', account: '6100 3410 8801 4852 89' },
];

const $ = (id) => document.getElementById(id);
const money = (amount) => new Intl.NumberFormat('en-US').format(amount) + '₮';
const cart = new Map();
let auth;
let db;
let activeUser = null;
let authReady = false;
let signingIn = false;
let sendingOrder = false;
let stopHistory = null;

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function button(label, className, onClick) {
    const node = element('button', className, label);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
}

function photo(src, alt = '') {
    const image = element('img');
    image.src = src;
    image.alt = alt;
    return image;
}

function openDetails(title, body) {
    $('dialog-title').textContent = title;
    $('dialog-body').replaceChildren(body);
    $('detail-dialog').showModal();
}

function renderMenu() {
    for (const product of products) {
        const card = element('article', 'product');
        const image = photo(product.image, product.name);
        if (product.fit) image.dataset.fit = product.fit;

        const view = button('', 'product-photo', () => {
            openDetails(product.name, photo(product.image, product.name));
        });
        view.setAttribute('aria-label', product.name + ' зураг харах');
        view.append(image);

        const info = element('div', 'product-info');
        const label = element('div');
        label.append(element('h3', '', product.name), element('p', 'product-price', money(product.price)));
        const add = button('+ Нэмэх', 'button button-outline', () => changeQuantity(product, 1));
        add.setAttribute('aria-label', product.name + ' сагсанд нэмэх');
        info.append(label, add);
        card.append(view, info);
        $('products').append(card);
    }
}

function renderBanks() {
    for (const bank of banks) {
        const details = element('details', 'bank');
        details.setAttribute('name', 'payment-bank');
        const summary = element('summary');
        summary.append(photo(bank.image), document.createTextNode(bank.name));
        const body = element('div', 'bank-body');
        const copy = button('Дугаар хуулах', 'button button-outline', async () => {
            try {
                await navigator.clipboard.writeText(bank.account.replaceAll(' ', ''));
                setMessage(bank.name + ' дансны дугаар хуулагдлаа.');
            } catch {
                setMessage('Дансны дугаарыг гараар хуулна уу.', true);
            }
        });
        body.append(
            element('strong', 'account-number', bank.account),
            element('span', 'muted', 'Алтан-Очир Хонгорзул'),
            copy,
        );
        details.append(summary, body);
        $('banks').append(details);
    }
}

function changeQuantity(product, change, restoreFocus = false) {
    if (sendingOrder) return;
    const count = (cart.get(product) || 0) + change;
    if (count > 0) cart.set(product, count);
    else cart.delete(product);
    setMessage('');
    renderCart();
    $('cart-announcement').textContent = product.name + ' · Сагсанд ' + Math.max(0, count) + ' ширхэг';
    if (restoreFocus) {
        const cartControl = $('cart-items').querySelector(
            '[data-product="' + product.image + '"][data-change="' + change + '"]',
        );
        const menuControl = Array.from($('products').children)[products.indexOf(product)].querySelector('.product-info button');
        (cartControl || menuControl).focus();
    }
}

function cartTotals() {
    let quantity = 0;
    let amount = 0;
    for (const [product, count] of cart) {
        quantity += count;
        amount += product.price * count;
    }
    return { quantity, amount };
}

function renderCart() {
    const rows = [];
    for (const [product, count] of cart) {
        const row = element('li', 'cart-row');
        const item = element('div', 'cart-product');
        const info = element('div');
        info.append(element('strong', '', product.name), element('small', '', money(product.price * count)));
        item.append(photo(product.image), info);

        const controls = element('div', 'quantity');
        const minus = quantityButton(product, -1);
        const plus = quantityButton(product, 1);
        controls.append(minus, element('span', '', count), plus);
        row.append(item, controls);
        rows.push(row);
    }

    $('cart-items').replaceChildren(...rows);
    const { quantity, amount } = cartTotals();
    $('cart-count').textContent = quantity;
    $('total-price').textContent = money(amount);
    $('mobile-total').textContent = money(amount);
    $('mobile-cart').hidden = !quantity;
    $('cart-empty').hidden = Boolean(quantity);
    $('checkout').hidden = !quantity;
    syncCheckout();
}

function quantityButton(product, change) {
    const decrease = change < 0;
    const control = button(decrease ? '−' : '+', 'button button-outline', () => {
        changeQuantity(product, change, true);
    });
    control.dataset.product = product.image;
    control.dataset.change = change;
    control.setAttribute('aria-label', product.name + (decrease ? ' хасах' : ' нэмэх'));
    return control;
}

function setMessage(text, error = false) {
    $('cart-message').textContent = text;
    $('cart-message').dataset.error = error;
}

function syncCheckout() {
    $('checkout').noValidate = !activeUser;
    $('checkout-fields').disabled = sendingOrder;
    $('place-order').disabled = !authReady || signingIn || sendingOrder;
    $('place-order').textContent = sendingOrder ? 'Илгээж байна…' : activeUser ? 'Захиалга өгөх' : 'Google-ээр нэвтэрч үргэлжлүүлэх';
    $('sign-in').disabled = !authReady || signingIn;
    $('sign-out').disabled = sendingOrder;
    $('cart-items').querySelectorAll('button').forEach((control) => { control.disabled = sendingOrder; });
    $('products').querySelectorAll('.product-info button').forEach((control) => { control.disabled = sendingOrder; });
}

async function signIn() {
    if (!authReady || signingIn) return;
    signingIn = true;
    setMessage('');
    $('auth-message').textContent = '';
    syncCheckout();
    try {
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        if (cart.size) setMessage('Хүргэлтийн мэдээллээ бөглөөд захиалгаа илгээнэ үү.');
    } catch {
        const message = 'Google-ээр нэвтэрч чадсангүй. Дахин оролдоно уу.';
        if (document.activeElement === $('sign-in') || !cart.size) {
            $('auth-message').textContent = message;
            $('auth-message').dataset.error = true;
        } else setMessage(message, true);
    } finally {
        signingIn = false;
        syncCheckout();
    }
}

const orderDate = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Ulaanbaatar',
});
const statusStyles = new Map([
    ['Шинэ', 'new'],
    ['Төлбөр хүлээгдэж байна', 'pending'],
    ['Бэлтгэгдэж байна', 'preparing'],
    ['Хүргэлтэнд гарсан', 'shipping'],
    ['Хүргэгдсэн', 'delivered'],
    ['Цуцлагдсан', 'cancelled'],
]);

function historyMessage(message) {
    $('history-list').replaceChildren();
    $('history-table').hidden = true;
    $('history-message').textContent = message;
    $('history-message').hidden = false;
}

function historyRow(order) {
    const timestamp = order.createdAt?.toDate();
    const dateText = timestamp ? orderDate.format(timestamp) : 'Саяхан';
    const status = order.status || 'Шинэ';
    const total = money(order.totalPrice || 0);

    const row = element('tr', 'history-row');
    const dateCell = element('td', 'history-date');
    if (timestamp) {
        const time = element('time', '', dateText);
        time.dateTime = dateText;
        dateCell.append(time);
    } else dateCell.textContent = dateText;

    const badge = element('span', 'order-status', status);
    badge.dataset.status = statusStyles.get(status) || 'other';
    const statusCell = element('td', 'history-status');
    statusCell.append(badge);

    const action = element('td', 'history-action');
    const detail = button('›', 'history-detail', () => showOrder(order));
    detail.setAttribute('aria-label', dateText + ', ' + total + ', ' + status + ' — дэлгэрэнгүй');
    detail.title = 'Дэлгэрэнгүй';
    action.append(detail);
    row.append(dateCell, element('td', 'history-amount', total), statusCell, action);
    row.addEventListener('click', (event) => {
        if (!detail.contains(event.target)) detail.click();
    });
    return row;
}

function observeHistory(userId) {
    historyMessage('Ачаалж байна…');
    return db.collection('orders').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(10)
        .onSnapshot((snapshot) => {
            if (activeUser?.uid !== userId) return;
            if (snapshot.empty) {
                historyMessage('Одоогоор захиалга байхгүй.');
                return;
            }
            $('history-list').replaceChildren(...snapshot.docs.map((document) => historyRow(document.data())));
            $('history-message').hidden = true;
            $('history-table').hidden = false;
        }, () => {
            if (activeUser?.uid === userId) historyMessage('Захиалгын түүхийг ачаалж чадсангүй.');
        });
}

function showOrder(order) {
    const details = element('div');
    const items = element('ul');
    for (const [name, count] of Object.entries(order.items || {})) {
        items.append(element('li', '', name + ' × ' + count));
    }
    details.append(
        element('p', '', 'Хаяг: ' + (order.address || '')),
        element('p', '', 'Утас: ' + (order.userPhone || '')),
        items,
        element('strong', '', 'Нийт дүн: ' + money(order.totalPrice || 0)),
    );
    openDetails('Захиалгын мэдээлэл', details);
}

async function sendOrder(event) {
    event.preventDefault();
    if (!authReady || sendingOrder || !cart.size) return;
    if (!activeUser) {
        await signIn();
        return;
    }

    const userPhone = $('phone').value.trim();
    const address = $('office').value.trim();
    if (!userPhone || !address) {
        setMessage('Утасны дугаар, хүргэлтийн хаягаа бөглөнө үү.', true);
        return;
    }

    const user = activeUser;
    const items = Object.fromEntries(Array.from(cart, ([product, count]) => [product.name, count]));
    const totalPrice = cartTotals().amount;
    sendingOrder = true;
    syncCheckout();
    setMessage('');
    try {
        await db.collection('orders').add({
            userId: user.uid,
            userName: user.displayName,
            userPhone,
            address,
            items,
            totalPrice,
            status: 'Шинэ',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        cart.clear();
        $('checkout').reset();
        $('banks').querySelectorAll('details').forEach((details) => { details.open = false; });
        renderCart();
        setMessage('Таны захиалгыг хүлээн авлаа.');
    } catch {
        setMessage('Захиалгыг илгээж чадсангүй. Дахин оролдоно уу.', true);
    } finally {
        sendingOrder = false;
        syncCheckout();
    }
}

renderMenu();
renderBanks();
renderCart();
if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
        $('mobile-cart').classList.toggle('cart-in-view', entry.isIntersecting);
    }, { rootMargin: '0px 0px -72px 0px' }).observe($('cart'));
}
$('checkout').addEventListener('submit', sendOrder);
$('sign-in').addEventListener('click', signIn);
$('sign-out').addEventListener('click', async () => {
    try {
        await auth.signOut();
    } catch {
        $('auth-message').textContent = 'Системээс гарч чадсангүй. Дахин оролдоно уу.';
        $('auth-message').dataset.error = true;
    }
});

try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    auth.onAuthStateChanged((user) => {
        if (stopHistory) stopHistory();
        if (activeUser && activeUser.uid !== user?.uid) {
            cart.clear();
            $('checkout').reset();
            historyMessage('');
            $('detail-dialog').close();
            setMessage('');
            renderCart();
        }
        activeUser = user;
        authReady = true;
        $('sign-in').hidden = Boolean(user);
        $('sign-out').hidden = !user;
        $('user-name').textContent = user?.displayName || '';
        $('user-name').hidden = !user?.displayName;
        $('history-link').hidden = !user;
        $('order-history').hidden = !user;
        stopHistory = user ? observeHistory(user.uid) : null;
        syncCheckout();
    }, () => setMessage('Нэвтрэх үйлчилгээтэй холбогдож чадсангүй.', true));
} catch {
    setMessage('Нэвтрэх үйлчилгээтэй холбогдож чадсангүй. Хуудсаа дахин ачаална уу.', true);
}
