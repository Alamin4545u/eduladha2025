const firebaseConfig = {
    apiKey: "AIzaSyDtp3b0fdEvcjAPvmdupd00qDCbucyFIc0",
    authDomain: "mini-bot-735bf.firebaseapp.com",
    projectId: "mini-bot-735bf",
    storageBucket: "mini-bot-735bf.firebasestorage.app",
    messagingSenderId: "1056580233393",
    appId: "1:1056580233393:web:058609b1ca944020755a90"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Telegram
Telegram.WebApp.ready();
const tgUser = Telegram.WebApp.initDataUnsafe.user;
if (!tgUser) {
    document.body.innerHTML = "<h1 style='color:red;text-align:center;margin-top:50px;'>টেলিগ্রাম থেকে খুলুন!</h1>";
    throw new Error("Not in Telegram");
}

const telegramId = tgUser.id.toString();
const username = tgUser.username || tgUser.first_name || 'ইউজার';
const fullName = tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : '');
const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const photoUrl = tgUser.photo_url || 'https://via.placeholder.com/100';


// DOM Elements
const screens = document.querySelectorAll('.screen');
const navItems = document.querySelectorAll('.nav-item');
let userDocRef, config = { pointsPerAd: 10, minWithdraw: 500, dailyRewardPoints: 50, dailyRewardCooldown: 86400000, liveNotice: '', bannerUrls: [], referralReward: 50, dailySpinLimit: 1, spinReward: 100, dailyScratchLimit: 1, scratchReward: 50 };

// Set Home Header
document.getElementById('avatar').innerText = initials;
document.getElementById('userName').innerText = fullName;
document.getElementById('userUsername').innerText = `@${username}`;

// Set Profile
document.getElementById('profileImgBig').src = photoUrl;
document.getElementById('profileName').innerText = username;
document.getElementById('telegramId').innerText = telegramId;

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const screenId = item.dataset.screen;
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        if (screenId === 'history') loadHistory();
        if (screenId === 'task') loadTasks();
        if (screenId === 'wallet') loadPaymentMethods();
        if (screenId === 'spin') loadSpinLimit();
        if (screenId === 'scratch') initScratchCard();
    });
});

// Load Config (with live notice and banners)
async function loadConfig() {
    try {
        const doc = await db.collection('config').doc('settings').get();
        if (doc.exists) {
            config = { ...config, ...doc.data() };
            updatePointsDisplay();
            // Live Notice with scrolling
            const noticeSpan = document.getElementById('liveNotice').querySelector('span');
            noticeSpan.innerText = config.liveNotice || 'কোনো নোটিস নেই';
            // If text is short, no animation; if long, animate
            if (noticeSpan.scrollWidth > document.getElementById('liveNotice').clientWidth) {
                noticeSpan.style.animation = 'scroll-left 15s linear infinite';
            } else {
                noticeSpan.style.animation = 'none';
            }
            // Banners
            const container = document.getElementById('bannerContainer');
            container.innerHTML = '';
            config.bannerUrls.forEach((url, index) => {
                const img = document.createElement('img');
                img.className = 'banner';
                img.src = url;
                img.alt = `Banner ${index + 1}`;
                img.style.animationDelay = `${0.2 * (index + 1)}s`;
                container.appendChild(img);
            });
        }
    } catch (e) { console.error(e); }
}

function updatePointsDisplay() {
    document.getElementById('adPoints').innerText = config.pointsPerAd;
    document.getElementById('adPointsTask').innerText = config.pointsPerAd;
    document.getElementById('dailyPoints').innerText = config.dailyRewardPoints;
    document.getElementById('dailyPointsTask').innerText = config.dailyRewardPoints;
    document.getElementById('spinPoints').innerText = config.spinReward;
    document.getElementById('scratchPoints').innerText = config.scratchReward;
    document.getElementById('amount').placeholder = `ন্যূনতম ${config.minWithdraw} ৳`;
}

// Auth & Realtime Balance
auth.signInAnonymously().then(() => {
    auth.onAuthStateChanged(async user => {
        if (!user) return;
        userDocRef = db.collection('users').doc(user.uid);

        const doc = await userDocRef.get();
        if (!doc.exists) {
            await userDocRef.set({
                balance: 0, telegramId, username: fullName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastAdWatched: null,
                lastDailyClaim: null,
                lastSpin: null,
                spinCount: 0,
                lastScratch: null,
                scratchCount: 0,
                referrals: 0
            });
        }

        // Realtime Balance
        userDocRef.onSnapshot(snap => {
            const balance = snap.data().balance || 0;
            document.getElementById('balance').innerText = balance;
            document.getElementById('balanceWallet').innerText = balance;
        });

        loadConfig();
        document.getElementById('watchAd').disabled = false;
        document.getElementById('dailyClaim').disabled = false;
        document.getElementById('spinBtn').disabled = false;
        document.getElementById('scratchBtn').disabled = false;
        loadReferralLink();
    });
});

// Load Referral Link
async function loadReferralLink() {
    document.getElementById('referralLink').innerText = `https://t.me/your_bot?start=refer_${telegramId}`;
    document.getElementById('shareReferral').onclick = () => {
        Telegram.WebApp.shareUrl(`https://t.me/your_bot?start=refer_${telegramId}`, 'রেফার করে পান ' + config.referralReward + ' ৳!');
    };
    // Check if referred
    const startParam = Telegram.WebApp.initDataUnsafe.start_param;
    if (startParam && startParam.startsWith('refer_')) {
        const referrerId = startParam.split('_')[1];
        const referrerDoc = db.collection('users').doc(referrerId);
        await referrerDoc.update({
            balance: firebase.firestore.FieldValue.increment(config.referralReward),
            referrals: firebase.firestore.FieldValue.increment(1)
        });
        alert('রেফারেল সফল! রিওয়ার্ড পেয়েছেন।');
    }
}

// Watch Ad (in Task)
document.getElementById('watchAd').onclick = async () => {
    if (typeof window.showGiga === 'undefined') return alert('GigaPub লোড হয়নি');
    const btn = document.getElementById('watchAd'); btn.disabled = true;
    try {
        const snap = await userDocRef.get();
        const last = snap.data().lastAdWatched;
        if (last && (Date.now() - last.toDate().getTime()) < 90000) {
            alert('৯০ সেকেন্ড অপেক্ষা করুন'); btn.disabled = false; return;
        }
        await window.showGiga();
        await userDocRef.update({
            balance: firebase.firestore.FieldValue.increment(config.pointsPerAd),
            lastAdWatched: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert(`অভিনন্দন! ${config.pointsPerAd} ৳ পেয়েছেন`);
    } catch (e) { alert('এ্যাড দেখতে সমস্যা: ' + e.message); }
    btn.disabled = false;
};

// Daily Claim (in Home)
document.getElementById('dailyClaim').onclick = async () => {
    const btn = document.getElementById('dailyClaim'); btn.disabled = true;
    try {
        const snap = await userDocRef.get();
        const last = snap.data().lastDailyClaim;
        if (last && (Date.now() - last.toDate().getTime()) < config.dailyRewardCooldown) {
            const remaining = Math.ceil((config.dailyRewardCooldown - (Date.now() - last.toDate().getTime())) / 1000);
            alert(`আবার ক্লেইম করতে ${Math.floor(remaining/3600)} ঘণ্টা অপেক্ষা করুন`);
            btn.disabled = false; return;
        }
        await window.showGiga();
        await userDocRef.update({
            balance: firebase.firestore.FieldValue.increment(config.dailyRewardPoints),
            lastDailyClaim: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert(`ডেইলি রিওয়ার্ড! ${config.dailyRewardPoints} ৳ পেয়েছেন`);
    } catch (e) { alert('ক্লেইম ফেল: ' + e.message); }
    btn.disabled = false;
};

// Spin Button
document.getElementById('spinBtn').onclick = () => {
    document.getElementById('spin').classList.add('active');
    screens.forEach(s => s.classList.remove('active'));
    loadSpinLimit();
};

// Scratch Button
document.getElementById('scratchBtn').onclick = () => {
    document.getElementById('scratch').classList.add('active');
    screens.forEach(s => s.classList.remove('active'));
    initScratchCard();
};

// Load Spin Limit
async function loadSpinLimit() {
    const snap = await userDocRef.get();
    const today = new Date().toDateString();
    let spinCount = snap.data().spinCount || 0;
    const lastSpin = snap.data().lastSpin ? snap.data().lastSpin.toDate().toDateString() : '';
    if (lastSpin !== today) {
        spinCount = 0;
        await userDocRef.update({ spinCount: 0 });
    }
    document.getElementById('spinLimit').innerText = `আজকের স্পিন: ${config.dailySpinLimit - spinCount} বাকি`;
}

// Spin Wheel
document.getElementById('spinWheelBtn').onclick = async () => {
    const snap = await userDocRef.get();
    const spinCount = snap.data().spinCount || 0;
    if (spinCount >= config.dailySpinLimit) {
        alert('আজকের স্পিন লিমিট শেষ!');
        return;
    }
    const wheel = document.getElementById('wheel');
    wheel.style.transition = 'transform 4s ease-out';
    wheel.style.transform = `rotate(${360 * 5 + Math.random() * 360}deg)`;
    setTimeout(async () => {
        try {
            await window.showGiga();
            await userDocRef.update({
                balance: firebase.firestore.FieldValue.increment(config.spinReward),
                lastSpin: firebase.firestore.FieldValue.serverTimestamp(),
                spinCount: firebase.firestore.FieldValue.increment(1)
            });
            alert(`স্পিন রিওয়ার্ড! ${config.spinReward} ৳ পেয়েছেন`);
            loadSpinLimit();
            wheel.style.transition = 'none';
            wheel.style.transform = 'rotate(0deg)';
        } catch (e) { alert('স্পিন ফেল: ' + e.message); }
    }, 4000);
};

// Init Scratch Card
function initScratchCard() {
    const canvas = document.getElementById('scratchCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = 200;
    ctx.fillStyle = '#ccc';
    ctx.fillRect(0, 0, 300, 200);
    document.getElementById('scratchReward').innerText = `কনগ্র্যাটস! ${config.scratchReward} ৳`;
    let isDrawing = false;
    canvas.addEventListener('mousedown', () => isDrawing = true);
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(e.offsetX, e.offsetY, 20, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
    // For mobile touch
    canvas.addEventListener('touchstart', () => isDrawing = true);
    canvas.addEventListener('touchend', () => isDrawing = false);
    canvas.addEventListener('touchmove', (e) => {
        if (isDrawing) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

// Claim Scratch
document.getElementById('claimScratch').onclick = async () => {
    const snap = await userDocRef.get();
    const scratchCount = snap.data().scratchCount || 0;
    if (scratchCount >= config.dailyScratchLimit) {
        alert('আজকের স্ক্র্যাচ লিমিট শেষ!');
        return;
    }
    try {
        await window.showGiga();
        await userDocRef.update({
            balance: firebase.firestore.FieldValue.increment(config.scratchReward),
            lastScratch: firebase.firestore.FieldValue.serverTimestamp(),
            scratchCount: firebase.firestore.FieldValue.increment(1)
        });
        alert(`স্ক্র্যাচ রিওয়ার্ড! ${config.scratchReward} ৳ পেয়েছেন`);
    } catch (e) { alert('ক্লেইম ফেল: ' + e.message); }
};

// Withdraw (in Wallet)
const modal = document.getElementById('withdrawModal');
document.getElementById('withdrawBtn').onclick = () => modal.style.display = 'flex';
document.getElementById('closeModal').onclick = () => modal.style.display = 'none';
document.getElementById('submitWithdraw').onclick = async () => {
    const amount = parseInt(document.getElementById('amount').value);
    const details = document.getElementById('paymentDetails').value.trim();
    if (amount < config.minWithdraw || !details) return alert('সঠিক তথ্য দিন');
    try {
        const snap = await userDocRef.get();
        if (snap.data().balance < amount) return alert('ব্যালেন্স কম');
        await db.collection('withdrawals').add({
            userUid: auth.currentUser.uid, telegramId, amount, details,
            status: 'pending', requestedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await userDocRef.update({ balance: firebase.firestore.FieldValue.increment(-amount) });
        alert('উইথড্র রিকোয়েস্ট সফল!');
        modal.style.display = 'none';
        document.getElementById('amount').value = '';
        document.getElementById('paymentDetails').value = '';
    } catch (e) { alert('উইথড্র ফেল: ' + e.message); }
};

// Load History
async function loadHistory() {
    const container = document.getElementById('historyList');
    container.innerHTML = '<p>লোড হচ্ছে...</p>';
    try {
        const snap = await db.collection('withdrawals')
            .where('userUid', '==', auth.currentUser.uid)
            .orderBy('requestedAt', 'desc').get();
        if (snap.empty) {
            container.innerHTML = '<p style="color:#aaa;text-align:center;">কোনো হিস্ট্রি নেই</p>';
            return;
        }
        container.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div><strong>পরিমাণ:</strong> ৳ ${d.amount}</div>
                <div><strong>নম্বর:</strong> ${d.details}</div>
                <div><strong>তারিখ:</strong> ${new Date(d.requestedAt.toDate()).toLocaleString('bn-BD')}</div>
                <div><strong>স্ট্যাটাস:</strong> <span class="status-${d.status}">${d.status === 'pending' ? 'পেন্ডিং' : d.status === 'paid' ? 'পেইড' : 'রিজেক্ট'}</span></div>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        container.innerHTML = '<p style="color:red;">হিস্ট্রি লোড ফেল</p>';
    }
}
