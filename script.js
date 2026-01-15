const firebaseConfig = {
    apiKey: "AIzaSyDpVh6TB0eVPHhoXjDHfxJuMjnkYnvlwRM",
    authDomain: "joymouth-e0898.firebaseapp.com",
    projectId: "joymouth-e0898",
    storageBucket: "joymouth-e0898.firebasestorage.app",
    messagingSenderId: "716037708846",
    appId: "1:716037708846:web:22691690cb8f214cfb13bf",
    measurementId: "G-0DGDM401SN"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();

let cart = [];
let total = 0;

const productImages = {
    "Бүргер": "burger_real.jpg", "Сэндвич": "sandwich_real.jpg",
    "Кимбаб": "kimbap_real.JPG", "Чиабатта": "ciabatta_real.jpg"
};

function getStatusColor(status) {
    switch(status) {
        case "Шинэ": return "#f39c12";
        case "Төлбөр хүлээгдэж байна": return "#3498db";
        case "Бэлтгэгдэж байна": return "#9b59b6";
        case "Хүргэлтэнд гарсан": return "#e67e22";
        case "Хүргэгдсэн": return "#2ecc71";
        case "Цуцлагдсан": return "#e74c3c";
        default: return "#95a5a6";
    }
}

function signInWithGoogle() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
function logout() { auth.signOut(); }

auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'flex';
        document.getElementById('user-info').innerText = "👤 " + user.displayName;
        observeOrderHistory(user.uid); 
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-content').style.display = 'none';
    }
});

function addToCart(name, price, icon) {
    cart.push({name, price, icon});
    total += price;
    updateCartUI();
}

function removeFromCart(name) {
    const index = cart.findIndex(item => item.name === name);
    if (index > -1) {
        total -= cart[index].price;
        cart.splice(index, 1); 
        updateCartUI();
    }
}

function updateCartUI() {
    const list = document.getElementById('cart-items');
    list.innerHTML = "";
    const counts = {};
    cart.forEach(item => { counts[item.name] = (counts[item.name] || {p:item.price, c:0}); counts[item.name].c++; });

    for (const name in counts) {
        let li = document.createElement('li');
        li.className = "cart-item-container";
        li.innerHTML = `
            <img src="${productImages[name]}" style="width:45px; height:45px; border-radius:10px; object-fit:cover;">
            <div style="flex:1;">
                <div style="font-weight:600; font-size:14px;">${name}</div>
                <small>${(counts[name].p * counts[name].c).toLocaleString()}₮</small>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button onclick="removeFromCart('${name}')" style="width:24px; height:24px; border-radius:50%; border:1px solid #ddd; background:white;">-</button>
                <span style="font-weight:bold;">${counts[name].c}</span>
                <button onclick="addToCart('${name}', ${counts[name].p}, '')" style="width:24px; height:24px; border-radius:50%; border:1px solid #ddd; background:white;">+</button>
            </div>`;
        list.appendChild(li);
    }
    document.getElementById('total-price').textContent = total.toLocaleString();
}

async function sendOrder() {
    const user = auth.currentUser;
    const office = document.getElementById('office').value;
    const phone = document.getElementById('phone').value;
    if (!user || cart.length === 0 || !office || !phone) return Swal.fire("Дутуу", "Мэдээллээ шалгана уу", "warning");

    const itemCounts = {};
    cart.forEach(item => { itemCounts[item.name] = (itemCounts[item.name] || 0) + 1; });

    try {
        await db.collection("orders").add({
            userId: user.uid, userName: user.displayName, userPhone: phone,
            address: office, items: itemCounts, totalPrice: total,
            status: "Шинэ", createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        cart = []; total = 0; updateCartUI();
        Swal.fire("Амжилттай", "Захиалга илгээгдлээ", "success");
    } catch (e) { Swal.fire("Алдаа", e.message, "error"); }
}

function observeOrderHistory(userId) {
    const historyList = document.getElementById('history-list');
    db.collection("orders").where("userId", "==", userId).orderBy("createdAt", "desc").limit(10)
    .onSnapshot((snapshot) => {
        if (snapshot.empty) { historyList.innerHTML = "<p style='color:#888;'>Түүх хоосон байна.</p>"; return; }
        let html = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : "Саяхан";
            const color = getStatusColor(data.status);
            html += `
                <div onclick="showOrderDetails('${doc.id}')" style="cursor:pointer; background:white; padding:15px; border-radius:15px; margin-bottom:10px; border-left:6px solid ${color}; box-shadow:0 2px 5px rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center;">
                    <div><strong>📅 ${date}</strong><br><small>${data.totalPrice.toLocaleString()}₮</small></div>
                    <span style="background:${color}; color:white; padding:5px 12px; border-radius:20px; font-size:11px; font-weight:bold;">${data.status}</span>
                </div>`;
        });
        historyList.innerHTML = html;
    });
}

async function showOrderDetails(id) {
    const doc = await db.collection("orders").doc(id).get();
    const data = doc.data();
    let items = Object.entries(data.items).map(([n, c]) => `<li>${n} x ${c}</li>`).join('');
    Swal.fire({ title: 'Захиалга', html: `<div style="text-align:left;">📍 ${data.address}<br>📞 ${data.userPhone}<hr><ul>${items}</ul></div>` });
}

function showProductImage(url, title) { Swal.fire({ title: title, imageUrl: url, imageWidth: 400 }); }
