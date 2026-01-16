const firebaseConfig = {
    apiKey: "AIzaSyDpVh6TB0eVPHhoXjDHfxJuMjnkYnvlwRM",
    authDomain: "joymouth-e0898.firebaseapp.com",
    projectId: "joymouth-e0898",
    storageBucket: "joymouth-e0898.firebasestorage.app",
    messagingSenderId: "716037708846",
    appId: "1:716037708846:web:22691690cb8f214cfb13bf",
    measurementId: "G-0DGDM401SN"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let cart = [];
let total = 0;

const products = [
    { name: "Бүргер", price: 7000, img: "burger_real.jpg" },
    { name: "Сэндвич", price: 6500, img: "sandwich_real.jpg" },
    { name: "Кимбаб", price: 4000, img: "kimbap_real.JPG" },
    { name: "Чиабатта", price: 8000, img: "ciabatta_real.jpg" }
];

// Хоолны жагсаалт харуулах
function renderProducts() {
    const list = document.getElementById('product-list');
    if(!list) return;
    list.innerHTML = products.map(p => `
        <div class="product-card">
            <button class="add-btn" onclick="addToCart('${p.name}', ${p.price})">+</button>
            <img src="${p.img}" onerror="this.src='https://via.placeholder.com/150'">
            <h3>${p.name}</h3>
            <div class="price-tag">${p.price.toLocaleString()}₮</div>
        </div>
    `).join('');
}

function addToCart(name, price) {
    cart.push({name, price});
    total += price;
    updateCartUI();
}

function removeFromCart(name) {
    const idx = cart.findIndex(i => i.name === name);
    if(idx > -1) {
        total -= cart[idx].price;
        cart.splice(idx, 1);
        updateCartUI();
    }
}

function updateCartUI() {
    const container = document.getElementById('cart-items');
    const counts = {};
    cart.forEach(i => { counts[i.name] = (counts[i.name] || {p:i.price, c:0}); counts[i.name].c++; });
    
    container.innerHTML = Object.entries(counts).map(([name, data]) => `
        <div class="cart-item">
            <div style="font-size:14px; font-weight:600;">${name}</div>
            <div class="qty-control">
                <button onclick="removeFromCart('${name}')" style="border:none; background:none; cursor:pointer; color:#e74c3c; font-weight:800;">-</button>
                <span>${data.c}</span>
                <button onclick="addToCart('${name}', ${data.p})" style="border:none; background:none; cursor:pointer; color:#2ecc71; font-weight:800;">+</button>
            </div>
            <div style="font-weight:800;">${(data.p * data.c).toLocaleString()}₮</div>
        </div>
    `).join('');
    
    document.getElementById('total-price').innerText = total.toLocaleString();
}

async function sendOrder() {
    const user = auth.currentUser;
    const office = document.getElementById('office').value;
    const phone = document.getElementById('phone').value;

    if (!user) return auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    if (cart.length === 0 || !office || !phone) return Swal.fire("Дутуу", "Мэдээллээ бүрэн оруулна уу", "warning");

    const itemCounts = {};
    cart.forEach(i => itemCounts[i.name] = (itemCounts[i.name] || 0) + 1);

    try {
        await db.collection("orders").add({
            userId: user.uid, userName: user.displayName, userPhone: phone,
            address: office, items: itemCounts, totalPrice: total,
            status: "Шинэ", createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        cart = []; total = 0; updateCartUI();
        Swal.fire("Амжилттай", "Захиалга илгээгдлээ!", "success");
    } catch (e) { Swal.fire("Алдаа", e.message, "error"); }
}

function copyText(text, msg) {
    navigator.clipboard.writeText(text);
    Swal.fire({ title: msg, icon: 'success', timer: 1000, showConfirmButton: false, toast: true, position: 'top-end' });
}

auth.onAuthStateChanged(user => {
    renderProducts();
    if(user) {
        db.collection("orders").where("userId", "==", user.uid).orderBy("createdAt", "desc").limit(5).onSnapshot(snap => {
            document.getElementById('history-list').innerHTML = snap.docs.map(doc => {
                const d = doc.data();
                return `<div class="history-item" style="border-left-color:${getStatusColor(d.status)}">
                    <div><b>${d.createdAt?.toDate().toLocaleDateString()}</b><br><small>${d.totalPrice.toLocaleString()}₮</small></div>
                    <span style="color:${getStatusColor(d.status)}; font-size:11px; font-weight:800;">${d.status}</span>
                </div>`;
            }).join('');
        });
    }
});

function getStatusColor(s) {
    const colors = { "Шинэ": "#f39c12", "Бэлтгэгдэж байна": "#9b59b6", "Хүргэлтэнд гарсан": "#e67e22", "Хүргэгдсэн": "#2ecc71", "Цуцлагдсан": "#e74c3c" };
    return colors[s] || "#95a5a6";
}
