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

// Барааны emoji-нууд
const productIcons = {
    "Бүргер": "🍔",
    "Сэндвич": "🥪",
    "Кимбаб": "🍱",
    "Чиабатта": "🍔"
};

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => alert(err.message));
}

auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('user-info').innerText = "👤 " + user.displayName;
    } else {
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('main-content').style.display = 'none';
    }
});

function logout() { auth.signOut(); }

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
        if (!itemCounts[item.name]) {
            itemCounts[item.name] = { price: item.price, count: 0, icon: item.icon };
        }
        itemCounts[item.name].count++;
    });

    for (const name in itemCounts) {
        let li = document.createElement('li');
        li.className = "cart-item-container";
        li.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #f0f0f0;";
        
        let subtotal = itemCounts[name].price * itemCounts[name].count;
        let imgUrl = productImages[name] || 'headlogo.png';
        let count = itemCounts[name].count;
        let iconsHTML = itemCounts[name].icon.repeat(count); // Тоогоор нь дүрс нэмэх

        li.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; flex:1;">
                <img src="${imgUrl}" style="width:45px; height:45px; border-radius:8px; object-fit:cover;">
                <div style="flex:1; display:flex; justify-content:space-between; align-items:center; padding-right:15px;">
                    <div>
                        <span style="font-weight:600; color:#5d4037; font-size:14px;">${name}</span>
                        <br><small style="color:#888;">${subtotal.toLocaleString()}₮</small>
                    </div>
                    <div style="text-align:right;">
                        <span class="item-icons">${iconsHTML}</span>
                        <span style="color:#2ecc71; font-weight:bold; margin-left:5px;">x${count}</span>
                    </div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button onclick="removeFromCart('${name}')" style="width:25px; height:25px; border-radius:50%; border:none; background:#ff7675; color:white;">-</button>
                <button onclick="addToCart('${name}', ${itemCounts[name].price}, '${itemCounts[name].icon}')" style="width:25px; height:25px; border-radius:50%; border:none; background:#2ecc71; color:white;">+</button>
            </div>`;
        list.appendChild(li);
    }
    document.getElementById('total-price').textContent = total.toLocaleString();
}

async function sendOrder(platform) {
    const user = auth.currentUser;
    const office = document.getElementById('office').value;
    const phone = document.getElementById('phone').value;

    if (!user || cart.length === 0 || !office || !phone) { 
        return Swal.fire("Мэдээлэл дутуу", "Утас, хаяг болон сагсаа шалгана уу!", "warning"); 
    }

    const itemCounts = {};
    cart.forEach(item => { itemCounts[item.name] = (itemCounts[item.name] || 0) + 1; });
    
    // Firestore-д хадгалах
    try {
        await db.collection("orders").add({
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
        
        let message = `*ШИНЭ ЗАХИАЛГА*\n👤: ${user.displayName}\n📞: ${phone}\n📍: ${office}\n\n*Захиалга:*\n${itemsText}💰: ${total.toLocaleString()}₮`;
        
        const myNumber = "97699921202"; 
        const url = platform === 'whatsapp' ? `https://wa.me/${myNumber}?text=${encodeURIComponent(message)}` : `https://t.me/AnarGantumur?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    } catch (e) {
        alert("Алдаа гарлаа, дахин оролдоно уу.");
    }
}

function copyText(text, msg) {
    navigator.clipboard.writeText(text).then(() => {
        Swal.fire({ title: msg, icon: 'success', timer: 1000, showConfirmButton: false, toast: true, position: 'top' });
    });
}
