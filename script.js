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

// Зургийн замуудыг тохируулах (Сагсанд харуулахад ашиглана)
const productImages = {
    "Бүргер": "burger_real.jpg",
    "Сэндвич": "sandwich_real.jpg",
    "Кимбаб": "kimbap_real.JPG", // .JPG байсныг .jpg болгов
    "Чиабатта": "ciabatta_real.jpg"
};

// Нэвтрэх функц
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

// Зураг харуулах функц
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

// Сагсны логик
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
        li.className = "cart-item-container";
        li.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #f0f0f0;";
        
        let subtotal = itemCounts[name].price * itemCounts[name].count;
        let imgUrl = productImages[name] || 'headlogo.png';
        let count = itemCounts[name].count; // Барааны тоо

        li.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; flex:1;">
                <img src="${imgUrl}" style="width:45px; height:45px; border-radius:8px; object-fit:cover; border:1px solid #eee;">
                <div style="text-align:left;">
                    <span style="font-weight:600; color
