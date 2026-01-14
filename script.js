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
        // Зөвхөн энэ хэрэглэгчийн түүхийг UID-аар нь ачаална
        loadOrderHistory(user.uid); 
    } else {
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('main-content').style.display = 'none';
    }
});

function showProductImage(imgUrl, title) {
    Swal.fire({ title: title, imageUrl: imgUrl, imageWidth: 400, showCloseButton: true, showConfirmButton: false });
}

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
    const itemCounts = {};

    cart.forEach(item => {
        if (!itemCounts[item.name]) { itemCounts[item.name] = { price: item.price, count: 0, icon: item.icon }; }
        itemCounts[item.name].count++;
    });

    for (const name in itemCounts) {
        let count = itemCounts[name].count;
        let icon = itemCounts[name].icon;
        let iconsHTML = "";

        if (icon.includes('.png') || icon.includes('.jpg') || icon.includes('.JPG')) {
            for(let i=0; i<count; i++) {
                iconsHTML += `<img src="${icon}" style="width:18px; height:18px; margin-right:2px; vertical-align:middle; border-radius:50%;">`;
            }
        } else {
            iconsHTML = `<span style="letter-spacing:-3px;">${icon.repeat(count)}</span>`;
        }

        let li = document.createElement('li');
        li.className = "cart-item-container";
        li.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex:1;">
                <img src="${productImages[name]}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
                <div style="flex:1; display:flex; justify-content:space-between; align-items:center; padding-right:10px;">
                    <div><span style="font-weight:600; font-size:14px;">${name}</span><br><small>${(itemCounts[name].price * count).toLocaleString()}₮</small></div>
                    <div>${iconsHTML} <span style="color:#2ecc71; font-weight:bold;">x${count}</span></div>
                </div>
            </div>
            <div style="display:flex; gap:5px;">
                <button onclick="removeFromCart('${name}')" style="width:24px; height:24px; border-radius:50%; border:none; background:#ff7675; color:white; cursor:pointer;">-</button>
                <button onclick="addToCart('${name}', ${itemCounts[name].price}, '${icon}')" style="width:24px; height:24px; border-radius:50%; border:none; background:#2ecc71; color:white; cursor:pointer;">+</button>
            </div>`;
        list.appendChild(li);
    }
    document.getElementById('total-price').textContent = total.toLocaleString();
}

async function loadOrderHistory(userId) {
    const historyList = document.getElementById('history-list');
    try {
        // userId-аар шүүж, зөвхөн тухайн хүнийхийг харуулна
        const snapshot = await db.collection("orders")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .limit(5)
            .get();

        if (snapshot.empty) { 
            historyList.innerHTML = "<p style='color:#888; font-size:13px; text-align:center;'>Түүх хоосон байна.</p>"; 
            return; 
        }

        let html = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : "Саяхан";
            const statusColor = data.status === "Шинэ" ? "#f39c12" : (data.status === "Хүргэгдсэн" ? "#2ecc71" : "#e74c3c");
            html += `
                <div style="background:#fff; padding:10px; border-radius:12px; margin-bottom:8px; border:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                    <div><strong style="font-size:13px;">${date}</strong><br><small style="color:#666;">${data.totalPrice.toLocaleString()}₮</small></div>
                    <span style="background:${statusColor}; color:white; padding:3px 8px; border-radius:10px; font-size:10px; font-weight:bold;">${data.status}</span>
                </div>`;
        });
        historyList.innerHTML = html;
    } catch (e) { 
        console.error("History Error: ", e);
        historyList.innerHTML = "<p style='font-size:12px; color:red;'>Ачаалахад алдаа гарлаа. Консол шалгана уу.</p>"; 
    }
}

async function sendOrder(platform) {
    const user = auth.currentUser;
    const office = document.getElementById('office').value;
    const phone = document.getElementById('phone').value;
    if (!user || cart.length === 0 || !office || !phone) { return Swal.fire("Дутуу", "Мэдээллээ бүрэн оруулна уу", "warning"); }

    const itemCounts = {};
    cart.forEach(item => { itemCounts[item.name] = (itemCounts[item.name] || 0) + 1; });
    
    try {
        await db.collection("orders").add({
            userId: user.uid, // UID-г хадгалах нь маш чухал
            userName: user.displayName,
            userPhone: phone,
            address: office,
            items: itemCounts,
            totalPrice: total,
            status: "Шинэ",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        let itemsText = "";
        for (const name in itemCounts) { itemsText += `- ${name} x${itemCounts[name]}\n`; }
        let message = `*ШИНЭ ЗАХИАЛГА*\n👤: ${user.displayName}\n📞: ${phone}\n📍: ${office}\n\n${itemsText}💰: ${total.toLocaleString()}₮`;
        const myNumber = "97699921202"; 
        const url = platform === 'whatsapp' ? `https://wa.me/${myNumber}?text=${encodeURIComponent(message)}` : `https://t.me/AnarGantumur?text=${encodeURIComponent(message)}`;
        
        // Сагс цэвэрлэх
        cart = [];
        total = 0;
        updateCartUI(); 
        
        window.open(url, '_blank');
        loadOrderHistory(user.uid); // Түүхийг шинэчилж харуулна
        
        Swal.fire("Амжилттай", "Захиалгыг илгээлээ!", "success");
    } catch (e) { 
        console.error(e);
        alert("Алдаа гарлаа: " + e.message); 
    }
}

function copyText(text, msg) {
    navigator.clipboard.writeText(text).then(() => {
        Swal.fire({ title: msg, icon: 'success', timer: 1000, showConfirmButton: false, toast: true, position: 'top' });
    });
}
