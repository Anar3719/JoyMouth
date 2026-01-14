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

function addToCart(name, price) {
    cart.push({name, price});
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
            itemCounts[item.name] = { price: item.price, count: 0 };
        }
        itemCounts[item.name].count++;
    });

    for (const name in itemCounts) {
        let li = document.createElement('li');
        li.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #f0f0f0;";
        
        let subtotal = itemCounts[name].price * itemCounts[name].count;
        
        li.innerHTML = `
            <div style="flex:1; text-align:left;">
                <span style="font-weight:500; color:#5d4037;">${name}</span>
                <br><small style="color:#888;">${subtotal.toLocaleString()}₮</small>
            </div>
            <div style="display:flex; align-items:center; gap:10px; background:#f4f7f6; padding:5px 10px; border-radius:20px;">
                <button onclick="removeFromCart('${name}')" 
                    style="width:28px; height:28px; border-radius:50%; border:none; background:#ff7675; color:white; font-weight:bold; cursor:pointer;">-</button>
                <span style="font-weight:bold; min-width:20px; text-align:center;">${itemCounts[name].count}</span>
                <button onclick="addToCart('${name}', ${itemCounts[name].price})" 
                    style="width:28px; height:28px; border-radius:50%; border:none; background:#2ecc71; color:white; font-weight:bold; cursor:pointer;">+</button>
            </div>
        `;
        list.appendChild(li);
    }
    document.getElementById('total-price').textContent = total.toLocaleString();
}

function sendOrder(platform) {
    const user = auth.currentUser;
    const office = document.getElementById('office').value;
    if (!user || cart.length === 0 || !office) { return alert("Мэдээллээ бүрэн оруулна уу!"); }

    const itemCounts = {};
    cart.forEach(item => { itemCounts[item.name] = (itemCounts[item.name] || 0) + 1; });

    let itemsText = "";
    for (const name in itemCounts) { itemsText += `- ${name} x${itemCounts[name]}\n`; }
    
    let message = `*ШИНЭ ЗАХИАЛГА*\n\n👤: ${user.displayName}\n📍: ${office}\n\n*Захиалга:*\n${itemsText}\n💰 *Нийт:* ${total.toLocaleString()}₮`;
    const myNumber = "97699921202"; 
    const url = platform === 'whatsapp' ? `https://wa.me/${myNumber}?text=${encodeURIComponent(message)}` : `https://t.me/AnarGantumur?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}
