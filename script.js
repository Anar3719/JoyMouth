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
    "Бүргер": "burger_real.jpg",
    "Сэндвич": "sandwich_real.jpg",
    "Кимбаб": "kimbap_real.JPG", 
    "Чиабатта": "ciabatta_real.jpg"
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

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((err) => alert("Алдаа: " + err.message));
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

function showProductImage(imgUrl, title) {
    Swal.fire({
        title: title,
        imageUrl: imgUrl,
        imageWidth: 400,
        showCloseButton: true,
        showConfirmButton: false
    });
}

function addToCart(name, price, icon) {
    cart.push({name, price, icon});
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
            itemCounts[item.name] = { price: item.price, count: 0, icon: item.icon }; 
            orderedKeys.push(item.name); 
        }
        itemCounts[item.name].count++;
    });

    orderedKeys.forEach(name => {
        let { price, count, icon } = itemCounts[name];
        let li = document.createElement('li');
        li.className = "cart-item-container";
        li.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; flex:1;">
                <img src="${productImages[name]}" style="width:45px; height:45px; border-radius:10px; object-fit:cover;">
                <div style="flex:1;">
                    <div style="font-weight:600; font-size:14px;">${name}</div>
                    <div style="color:#2ecc71; font-weight:bold; font-size:13px;">${(price * count).toLocaleString()}₮</div>
                </div>
            </div>
            <div class="qty-btn-group">
                <button class="minus-btn" onclick="removeFromCart('${name}')">−</button>
                <span class="qty-count">${count}</span>
                <button class="plus-btn" onclick="addToCart('${name}', ${price}, '${icon}')">+</button>
            </div>`;
        list.appendChild(li);
    });
    document.getElementById('total-price').textContent = total.toLocaleString();
}

function observeOrderHistory(userId) {
    const historyList = document.getElementById('history-list');
    db.collection("orders")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(10)
        .onSnapshot((snapshot) => {
            if (snapshot.empty) { 
                historyList.innerHTML = "<p style='color:#888; text-align:center;'>Түүх хоосон.</p>"; 
                return; 
            }
            let html = "";
            snapshot.forEach(doc => {
                const data = doc.data();
                const statusColor = getStatusColor(data.status);
                html += `
                    <div onclick="showOrderDetails('${doc.id}')" style="cursor:pointer; background:#fff; padding:12px; border-radius:12px; margin-bottom:8px; border-left: 5px solid ${statusColor}; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong style="font-size:13px;">📅 ${data.createdAt?.toDate().toLocaleDateString() || 'Саяхан'}</strong><br>
                            <small style="color:#666;">${data.totalPrice.toLocaleString()}₮</small>
                        </div>
                        <span style="background:${statusColor}; color:white; padding:4px 10px; border-radius:15px; font-size:10px; font-weight:bold;">${data.status}</span>
                    </div>`;
            });
            historyList.innerHTML = html;
        }, (err) => console.log("History index error:", err));
}

async function showOrderDetails(orderId) {
    const doc = await db.collection("orders").doc(orderId).get();
    const data = doc.data();
    let itemsHtml = "<ul style='text-align:left; padding:0; list-style:none;'>";
    for (const [name, count] of Object.entries(data.items)) {
        itemsHtml += `<li style='border-bottom:1px solid #eee; padding:5px 0;'>${name} x${count}</li>`;
    }
    itemsHtml += "</ul>";
    
    Swal.fire({
        title: 'Захиалгын дэлгэрэнгүй',
        html: `<div style="text-align:left; font-size:14px;">
                <p>📍 Хаяг: <b>${data.address}</b></p>
                <p>📞 Утас: <b>${data.userPhone}</b></p>
                ${itemsHtml}
                <p style="text-align:right; font-size:18px; margin-top:10px;"><b>Нийт: ${data.totalPrice.toLocaleString()}₮</b></p>
               </div>`
    });
}

async function sendOrder() {
    const user = auth.currentUser;
    const office = document.getElementById('office').value;
    const phone = document.getElementById('phone').value;

    if (!user || cart.length === 0 || !office || !phone) { 
        return Swal.fire("Дутуу", "Мэдээллээ бүрэн оруулна уу", "warning"); 
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
        cart = []; total = 0; updateCartUI();
        Swal.fire("Амжилттай", "Захиалга илгээгдлээ.", "success");
    } catch (e) { 
        Swal.fire("Алдаа", e.message, "error"); 
    }
}

function copyText(text, msg) {
    navigator.clipboard.writeText(text);
    Swal.fire({ title: msg, icon: 'success', timer: 1000, showConfirmButton: false, toast: true, position: 'top' });
}
