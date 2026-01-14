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
let cart = [];
let total = 0;

// AUTH FUNCTIONS
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
    Swal.fire({
        title: title,
        imageUrl: imgUrl,
        imageAlt: title,
        imageWidth: 400,
        imageHeight: 300,
        showCloseButton: true,
        showConfirmButton: false,
        background: '#fff',
        color: '#5d4037'
    });
}

// --- САГСНЫ ЛОГИК (ШИНЭЧЛЭГДСЭН) ---

function addToCart(name, price) {
    cart.push({name, price});
    total += price;
    updateCartUI();
}

// Барааг сагснаас нэг нэгээр нь хасах функц
function removeFromCart(name) {
    const index = cart.findIndex(item => item.name === name);
    if (index > -1) {
        total -= cart[index].price;
        cart.splice(index, 1); // Зөвхөн нэг ширхгийг устгана
        updateCartUI();
    }
}

function updateCartUI() {
    const list = document.getElementById('cart-items');
    list.innerHTML = "";
    
    const itemCounts = {};
    cart.forEach(item => {
        if (!itemCounts[item.name]) {
            itemCounts[item.name] = { price: item.price, count: 0 };
        }
        itemCounts[item.name].count++;
    });

    for (const name in itemCounts) {
        let li = document.createElement('li');
        li.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:10px 0; font-size:14px; border-bottom:1px dashed #eee;";
        
        let subtotal = itemCounts[name].price * itemCounts[name].count;
        
        li.innerHTML = `
            <div>
                <span>${name} <b>x${itemCounts[name].count}</b></span>
                <br><small style="color:#888">${subtotal.toLocaleString()}₮</small>
            </div>
            <button onclick="removeFromCart('${name}')" 
                style="background:#ff7675; color:white; border:none; padding:4px 10px; border-radius:6px; cursor:pointer; font-weight:bold;">
                Хасах
            </button>
        `;
        list.appendChild(li);
    }
    
    document.getElementById('total-price').textContent = total.toLocaleString();
}

function copyText(text, msg) {
    if (event) event.stopPropagation(); 
    navigator.clipboard.writeText(text).then(() => {
        Swal.fire({
            title: msg, icon: 'success', timer: 1500, showConfirmButton: false, toast: true, position: 'top'
        });
    });
}

function sendOrder(platform) {
    const user = auth.currentUser;
    const office = document.getElementById('office').value;

    if (!user || cart.length === 0 || !office) {
        return alert("Мэдээллээ бүрэн оруулна уу!");
    }

    const itemCounts = {};
    cart.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
    });

    let itemsText = "";
    for (const name in itemCounts) {
        itemsText += `- ${name} x${itemCounts[name]}\n`;
    }
    
    let message = `*ШИНЭ ЗАХИАЛГА*\n\n👤: ${user.displayName}\n📧: ${user.email}\n📍: ${office}\n\n*Захиалга:*\n${itemsText}\n💰 *Нийт:* ${total.toLocaleString()}₮\n\n⚠️ *ЧУХАЛ:* Төлбөрөө төлөөд Screenshot-оо заавал илгээнэ үү! 📸`;

    const myNumber = "97699921202"; 
    const myTelegram = "AnarGantumur";

    const url = platform === 'whatsapp' 
        ? `https://wa.me/${myNumber}?text=${encodeURIComponent(message)}`
        : `https://t.me/${myTelegram}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}