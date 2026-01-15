// --- FIREBASE ТОХИРГОО ---
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

// Бүтээгдэхүүний зургийн сан
const productImages = {
    "Бүргер": "burger_real.jpg",
    "Сэндвич": "sandwich_real.jpg",
    "Кимбаб": "kimbap_real.JPG", 
    "Чиабатта": "ciabatta_real.jpg"
};

// Төлөвийн өнгө тодорхойлох
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

// --- НЭВТРЭХ ХЭСЭГ ---
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((err) => alert("Алдаа: " + err.message));
}

function logout() { auth.signOut(); }

auth.onAuthStateChanged((user) => {
    const loginScreen = document.getElementById('login-screen');
    const mainContent = document.getElementById('main-content');
    
    if (user) {
        if(loginScreen) loginScreen.style.display = 'none';
        if(mainContent) mainContent.style.display = 'flex';
        observeOrderHistory(user.uid); 
    } else {
        if(loginScreen) loginScreen.style.display = 'flex';
        if(mainContent) mainContent.style.display = 'none';
    }
});

// --- САГСНЫ ФУНКЦҮҮД ---
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
    const badge = document.getElementById('cart-count-badge');
    const totalPriceEl = document.getElementById('total-price');
    
    if (!list) return;
    list.innerHTML = "";
    
    const itemCounts = {};
    cart.forEach(item => {
        if (!itemCounts[item.name]) { 
            itemCounts[item.name] = { price: item.price, count: 0, icon: item.icon }; 
        }
        itemCounts[item.name].count++;
    });

    let totalItems = 0;
    for (const name in itemCounts) {
        let { price, count } = itemCounts[name];
        totalItems += count;

        let li = document.createElement('li');
        li.className = "cart-item";
        li.innerHTML = `
            <img src="${productImages[name]}" onerror="this.src='https://via.placeholder.com/50'">
            <div class="cart-item-info">
                <strong>${name}</strong>
                <small>${(price * count).toLocaleString()}₮</small>
            </div>
            <div class="qty-controls">
                <button onclick="removeFromCart('${name}')" style="width:26px; height:26px; border-radius:8px; border:1px solid #ddd; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold;">-</button>
                <span style="font-weight:bold; min-width:20px; text-align:center;">${count}</span>
                <button onclick="addToCart('${name}', ${price}, '')" style="width:26px; height:26px; border-radius:8px; border:1px solid #ddd; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold;">+</button>
            </div>`;
        list.appendChild(li);
    }

    if(badge) badge.textContent = totalItems;
    if(totalPriceEl) totalPriceEl.textContent = total.toLocaleString();
}

// --- ЗАХИАЛГА ИЛГЭЭХ ---
async function sendOrder() {
    const user = auth.currentUser;
    const office = document.getElementById('office').value;
    const phone = document.getElementById('phone').value;

    if (!user || cart.length === 0 || !office || !phone) { 
        return Swal.fire("Дутуу", "Сагс хоосон эсвэл мэдээлэл дутуу байна", "warning"); 
    }

    const itemCounts = {};
    cart.forEach(item => { itemCounts[item.name] = (itemCounts[item.name] || 0) + 1; });
    
    try {
        await db.collection("orders").add({
            userId: user.uid,
            userName: user.displayName,
            userPhone: phone,
            address: office,
            items: itemCounts,
            totalPrice: total,
            status: "Шинэ",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        cart = [];
        total = 0;
        updateCartUI(); 
        document.getElementById('office').value = "";
        
        Swal.fire({
            title: "Амжилттай!",
            text: "Таны захиалгыг хүлээн авлаа.",
            icon: "success",
            confirmButtonColor: "#2ecc71"
        });

    } catch (e) { 
        console.error(e);
        Swal.fire("Алдаа", "Захиалга илгээхэд алдаа гарлаа", "error"); 
    }
}

// --- ЗАХИАЛГЫН ТҮҮХ ---
function observeOrderHistory(userId) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    db.collection("orders")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(8)
        .onSnapshot((snapshot) => {
            if (snapshot.empty) { 
                historyList.innerHTML = "<p style='color:#94a3b8; font-size:14px;'>Одоогоор захиалга байхгүй байна.</p>"; 
                return; 
            }

            let html = "";
            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : "Саяхан";
                const statusColor = getStatusColor(data.status);
                
                html += `
                    <div class="history-card" onclick="showOrderDetails('${doc.id}')" style="border-left: 5px solid ${statusColor}; cursor:pointer;">
                        <div>
                            <span style="font-size:12px; color:#94a3b8;">📅 ${date}</span><br>
                            <strong style="font-size:15px;">${data.totalPrice.toLocaleString()}₮</strong>
                        </div>
                        <div style="text-align:right;">
                            <span style="background:${statusColor}20; color:${statusColor}; padding:5px 12px; border-radius:10px; font-size:12px; font-weight:bold;">
                                ${data.status}
                            </span>
                        </div>
                    </div>`;
            });
            historyList.innerHTML = html;
        });
}

// Дэлгэрэнгүй харах (Popup)
async function showOrderDetails(orderId) {
    const doc = await db.collection("orders").doc(orderId).get();
    if (!doc.exists) return;
    const data = doc.data();
    
    let items = Object.entries(data.items).map(([n, c]) => `<li>${n} x ${c}</li>`).join('');

    Swal.fire({
        title: 'Захиалгын дэлгэрэнгүй',
        html: `<div style="text-align:left;">
                <p>📍 Хаяг: ${data.address}</p>
                <p>📊 Төлөв: <b style="color:${getStatusColor(data.status)}">${data.status}</b></p>
                <hr>
                <ul style="padding-left:20px;">${items}</ul>
               </div>`,
        confirmButtonText: 'Хаах'
    });
}
