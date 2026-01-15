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

// Төлөвийн өнгийг тодорхойлох
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

// Google нэвтрэлт
function signInWithGoogle() { 
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
    .catch(e => Swal.fire("Алдаа", "Нэвтэрч чадсангүй: " + e.message, "error"));
}

function logout() { auth.signOut(); }

// Хэрэглэгчийн төлөвийг хянах
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

// Сагсанд нэмэх
function addToCart(name, price) {
    cart.push({name, price});
    total += price;
    updateCartUI();
    
    // Гар утсанд зориулсан жижиг мэдэгдэл (vibration эсвэл toast)
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 800
    });
    Toast.fire({ icon: 'success', title: 'Сагсанд нэмэгдлээ' });
}

// Сагснаас хасах
function removeFromCart(name) {
    const index = cart.findIndex(item => item.name === name);
    if (index > -1) {
        total -= cart[index].price;
        cart.splice(index, 1); 
        updateCartUI();
    }
}

// Сагсны UI шинэчлэх
function updateCartUI() {
    const list = document.getElementById('cart-items');
    list.innerHTML = "";
    const counts = {};
    
    cart.forEach(item => { 
        counts[item.name] = (counts[item.name] || {p:item.price, c:0}); 
        counts[item.name].c++; 
    });

    for (const name in counts) {
        let li = document.createElement('li');
        li.className = "cart-item-container";
        li.innerHTML = `
            <img src="${productImages[name]}" class="cart-item-img" onerror="this.src='https://via.placeholder.com/50'">
            <div style="flex:1; margin-left:10px;">
                <div style="font-weight:600; font-size:14px;">${name}</div>
                <div style="color:#2ecc71; font-weight:700; font-size:13px;">${(counts[name].p * counts[name].c).toLocaleString()}₮</div>
            </div>
            <div class="quantity-controls" style="display:flex; align-items:center; gap:8px;">
                <button class="qty-btn" onclick="removeFromCart('${name}')" style="width:25px; height:25px; border-radius:50%; border:1px solid #ddd; background:white;">-</button>
                <span style="font-weight:800; min-width:15px; text-align:center;">${counts[name].c}</span>
                <button class="qty-btn" onclick="addToCart('${name}', ${counts[name].p})" style="width:25px; height:25px; border-radius:50%; border:1px solid #ddd; background:white;">+</button>
            </div>`;
        list.appendChild(li);
    }
    document.getElementById('total-price').textContent = total.toLocaleString();
}

// Захиалга илгээх
async function sendOrder() {
    const user = auth.currentUser;
    const office = document.getElementById('office').value;
    const phone = document.getElementById('phone').value;
    
    if (!user || cart.length === 0 || !office || !phone) {
        return Swal.fire("Мэдээлэл дутуу", "Сагс хоосон эсвэл хаяг, утасны дугаар дутуу байна.", "warning");
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
        
        // Амжилттай бол сагсыг цэвэрлэх
        cart = []; 
        total = 0; 
        updateCartUI();
        document.getElementById('office').value = "";
        document.getElementById('phone').value = "";
        
        Swal.fire("Амжилттай", "Таны захиалга баталгаажлаа. Түүх хэсгээс хянана уу.", "success");
    } catch (e) { 
        Swal.fire("Алдаа", "Захиалга илгээхэд алдаа гарлаа: " + e.message, "error"); 
    }
}

// Захиалгын түүхийг Real-time хянах
function observeOrderHistory(userId) {
    const historyList = document.getElementById('history-list');
    
    db.collection("orders")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(8)
    .onSnapshot((snapshot) => {
        let html = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const color = getStatusColor(data.status);
            const date = data.createdAt ? data.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Саяхан";
            
            // Захиалсан зүйлсийг текст болгож харуулах (Hover эсвэл жижиг тайлбарт)
            const itemString = Object.entries(data.items).map(([name, qty]) => `${name} x${qty}`).join(', ');

            html += `
                <div class="history-card" onclick="Swal.fire('Захиалгын дэлгэрэнгүй', '${itemString}', 'info')" style="cursor:pointer; border-left: 5px solid ${color}; background:white; padding:15px; border-radius:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div>
                        <div style="font-weight:700; font-size:14px;">📅 ${date}</div>
                        <small style="color:#666;">Нийт: ${data.totalPrice.toLocaleString()}₮</small>
                    </div>
                    <span style="background:${color}; color:white; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:800;">${data.status}</span>
                </div>`;
        });
        historyList.innerHTML = html || "<p style='color:#999; text-align:center;'>Түүх хоосон байна.</p>";
    }, (error) => {
        console.error("Firebase Error:", error);
        // Хэрэв индекс байхгүй бол алдаа заана
        if(error.code === 'failed-precondition') {
            historyList.innerHTML = "<p style='color:red;'>Эрэмбэлэлтийн индекс шаардлагатай.</p>";
        }
    });
}
