const firebaseConfig = {
    apiKey: "AIzaSyDpVh6TB0eVPHhoXjDHfxJuMjnkYnvlwRM",
    authDomain: "joymouth-e0898.firebaseapp.com",
    projectId: "joymouth-e0898",
    storageBucket: "joymouth-e0898.firebasestorage.app",
    messagingSenderId: "716037708846",
    appId: "1:716037708846:web:22691690cb8f214cfb13bf"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const db = firebase.firestore();

let cart = [];
let total = 0;

const productImages = {
    "Бүргер": "burger_real.jpg",
    "Сэндвич": "sandwich_real.jpg",
    "Кимбаб": "kimbap_real.JPG", 
    "Чиабатта": "ciabatta_real.jpg"
};

function signInWithGoogle() {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
}

function logout() { auth.signOut(); }

auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('user-info').innerText = "👤 " + user.displayName;
        observeOrderHistory(user.uid); 
    } else {
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('main-content').style.display = 'none';
    }
});

function addToCart(name, price) {
    cart.push({name, price});
    total += price;
    updateCartUI();
}

function removeFromCart(name) {
    const index = cart.findLastIndex(item => item.name === name);
    if (index > -1) {
        total -= cart[index].price;
        cart.splice(index, 1); 
        updateCartUI();
    }
}

function updateCartUI() {
    const list = document.getElementById('cart-items');
    if (!list) return;
    list.innerHTML = "";

    const orderedKeys = [];
    const itemCounts = {};

    cart.forEach(item => {
        if (!itemCounts[item.name]) { 
            itemCounts[item.name] = { price: item.price, count: 0 }; 
            orderedKeys.push(item.name); 
        }
        itemCounts[item.name].count++;
    });

    orderedKeys.forEach(name => {
        let { price, count } = itemCounts[name];
        let li = document.createElement('li');
        li.className = "cart-item-container";
        li.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex:1;">
                <img src="${productImages[name]}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
                <div>
                    <div style="font-weight:600; font-size:14px;">${name}</div>
                    <div style="color:#2ecc71; font-weight:bold; font-size:13px;">${(price * count).toLocaleString()}₮</div>
                </div>
            </div>
            <div class="qty-wrapper">
                <button class="qty-btn minus" onclick="removeFromCart('${name}')">-</button>
                <span class="qty-num">${count}</span>
                <button class="qty-btn plus" onclick="addToCart('${name}', ${price})">+</button>
            </div>`;
        list.appendChild(li);
    });
    document.getElementById('total-price').textContent = total.toLocaleString();
}

function observeOrderHistory(userId) {
    db.collection("orders").where("userId", "==", userId).orderBy("createdAt", "desc").limit(5).onSnapshot((snap) => {
        const historyList = document.getElementById('history-list');
        if (snap.empty) { historyList.innerHTML = "<small>Түүх хоосон</small>"; return; }
        historyList.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            const color = data.status === "Шинэ" ? "#f39c12" : "#2ecc71";
            return `<div style="background:white; padding:10px; border-radius:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid ${color};">
                <div style="font-size:13px;"><b>${data.totalPrice.toLocaleString()}₮</b><br><small>${data.status}</small></div>
                <small>${data.createdAt?.toDate().toLocaleDateString() || ""}</small>
            </div>`;
        }).join('');
    });
}

async function sendOrder() {
    const user = auth.currentUser;
    const office = document.getElementById('office').value;
    const phone = document.getElementById('phone').value;
    if (!user || cart.length === 0 || !office || !phone) return Swal.fire("Дутуу", "Мэдээллээ бүрэн оруулна уу", "warning");
    
    const itemCounts = {};
    cart.forEach(item => { itemCounts[item.name] = (itemCounts[item.name] || 0) + 1; });

    try {
        await db.collection("orders").add({
            userId: user.uid, userName: user.displayName, userPhone: phone, address: office,
            items: itemCounts, totalPrice: total, status: "Шинэ", createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        cart = []; total = 0; updateCartUI();
        Swal.fire("Амжилттай!", "Захиалгыг хүлээн авлаа.", "success");
    } catch (e) { Swal.fire("Алдаа", e.message, "error"); }
}

function copyText(text, msg) {
    navigator.clipboard.writeText(text);
    Swal.fire({ title: msg, icon: 'success', timer: 1000, showConfirmButton: false, toast: true, position: 'top' });
}
