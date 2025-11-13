// Firebase Config
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
const rewardBtns = document.querySelectorAll('.reward-btn');
let userDocRef;
let config = { 
    pointsPerAd: 10, minWithdraw: 500, dailyRewardPoints: 1, dailyRewardCooldown: 86400000, // ৳1 + 24h
    liveNotice: '', bannerUrls: [], montageAppId: '', montageAdId: '', 
    dailySpinLimit: 1, spinReward: 100, dailyScratchLimit: 1, scratchReward: 50,
    vpnEnabled: true, referReward: 1, botUrl: 'https://t.me/YourBot/YourApp'
};

let isTaskCountry = false;
 infinit;
const ALLOWED_COUNTRIES = ['US', 'UK', 'CA'];

// Set Home Header
document.getElementById('avatar').innerText = initials;
document.getElementById('userName').innerText = fullName;
document.getElementById('userUsername').innerText = `@${username}`;

// Set Profile
document.getElementById('profileImgBig').src = photoUrl;
document.getElementById('profileName').innerText = username;
document.getElementById('telegramId').innerText = telegramId;

// Navigation & Reward Buttons
function switchScreen(screenId) {
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    navItems.forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`[data-screen="${screenId}"]`);
    if (navItem) navItem.classList.add('active');

    if (screenId === 'history') loadHistory();
    if (screenId === 'task') loadTasks();
    if (screenId === 'wallet') loadPaymentMethods();
    if (screenId === 'spin') { loadSpinLimit(); }
    if (screenId === 'scratch') { loadScratchLimit(); initScratchCard(); }
    if (screenId === 'refer') setupReferralUI();
}

// Reward Buttons Click
rewardBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        if (screen === 'daily') {
            claimDaily(); // Gigapub ad + ৳1
        } else {
            switchScreen(screen);
        }
    });
});

// Navigation Click
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const screenId = item.dataset.screen;
        switchScreen(screenId);
    });
});

// Load Config
async function loadConfig() {
    try {
        const doc = await db.collection('config').doc('settings').get();
        if (doc.exists) {
            config = { ...config, ...doc.data() };
            updatePointsDisplay();
            const noticeSpan = document.getElementById('liveNotice').querySelector('span');
            noticeSpan.innerText = config.liveNotice || 'কোনো নোটিস নেই';
            if (noticeSpan.scrollWidth > document.getElementById('liveNotice').clientWidth) {
                noticeSpan.style.animation = 'scroll-left 15s linear infinite';
            } else {
                noticeSpan.style.animation = 'none';
            }
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
    } catch (e) { console.error("Config load error: ", e); }
}

// VPN & Country Check
async function performIpCheck() {
    if (!config.vpnEnabled) {
        console.log("VPN check disabled by admin.");
        isTaskCountry = true;
        return;
    }
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error(`IP API request failed with status ${response.status}`);
        const data = await response.json();

        if (data.security && (data.security.vpn || data.security.proxy || data.security.tor)) {
            document.body.innerHTML = `
                <div style='color:red; text-align:center; margin-top:50px; padding: 20px; height: 100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;'>
                    <i class="fas fa-shield-alt" style="font-size: 60px; margin-bottom: 20px;"></i>
                    <h1>VPN/Proxy ডিটেক্টেড</h1>
                    <p>অ্যাপ ব্যবহার করতে আপনার VPN/Proxy বন্ধ করুন।</p>
                </div>`;
            throw new Error("VPN detected");
        }
        
        if (ALLOWED_COUNTRIES.includes(data.country_code)) {
            isTaskCountry = true;
        } else {
            isTaskCountry = false;
        }

    } catch (error) {
        console.error("IP Check Error:", error);
        isTaskCountry = false;
        if (error.message !== "VPN detected") {
             alert("আপনার লোকেশন যাচাই করা যায়নি। কিছু ফিচার বন্ধ থাকতে পারে।");
        }
    } finally {
        updateTaskButtonsState();
    }
}

function updateTaskButtonsState() {
    const buttons = [document.getElementById('dailyClaim'), document.getElementById('spinBtn'), document.getElementById('scratchBtn')];
    buttons.forEach(btn => {
        if (isTaskCountry) {
            btn.disabled = false;
            btn.title = "";
        } else {
            btn.disabled = true;
            btn.title = "এই ফিচারটি শুধুমাত্র US/UK/CA ব্যবহারকারীদের জন্য উপলব্ধ।";
        }
    });
}

// Referral
async function handleReferral(newUserDocRef) {
    const urlParams = new URLSearchParams(window.location.search);
    const startParam = urlParams.get('start');
    if (!startParam || !startParam.startsWith('REF_')) return;

    const referrerId = startParam.split('REF_')[1];
    if (!referrerId || referrerId === telegramId) return;

    const usersRef = db.collection('users');
    const query = usersRef.where('telegramId', '==', referrerId).limit(1);
    const snapshot = await query.get();

    if (!snapshot.empty) {
        const referrerDoc = snapshot.docs[0];
        await referrerDoc.ref.update({
            balance: firebase.firestore.FieldValue.increment(config.referReward)
        });
        await newUserDocRef.update({ referredBy: referrerId });
        console.log(`User ${telegramId} referred by ${referrerId}. Reward of ${config.referReward} given.`);
    }
}

function setupReferralUI() {
    const referralLink = `${config.botUrl}?start=REF_${telegramId}`;
    const linkInput = document.getElementById('referralLink');
    if(linkInput) linkInput.value = referralLink;
    
    const rewardAmount = document.getElementById('referRewardAmount');
    if(rewardAmount) rewardAmount.innerText = config.referReward;

    const copyButton = document.getElementById('copyReferralLink');
    if (copyButton) {
        copyButton.onclick = () => {
            linkInput.select();
            linkInput.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(linkInput.value).then(() => {
                alert('রেফারেল লিঙ্ক কপি করা হয়েছে!');
            }, () => {
                alert('কপি করতে ব্যর্থ!');
            });
        };
    }
    if(linkInput){
         linkInput.onclick = () => copyButton.click();
    }
}

function updatePointsDisplay() {
    document.getElementById('dailyPoints').innerText = config.dailyRewardPoints;
    document.getElementById('spinPoints').innerText = config.spinReward;
    document.getElementById('scratchPoints').innerText = config.scratchReward;
    document.getElementById('amount').placeholder = `ন্যূনতম ${config.minWithdraw} ৳`;
    document.getElementById('scratchReward').innerText = `কনগ্র্যাটস! ৳${config.scratchReward}`;
}

// Auth & Realtime Balance
auth.signInAnonymously().catch(err => console.error("Anonymous sign-in failed:", err))
    .then(() => {
        auth.onAuthStateChanged(async user => {
            if (!user) return;
            userDocRef = db.collection('users').doc(user.uid);

            await loadConfig();
            await performIpCheck();

            const doc = await userDocRef.get();
            if (!doc.exists) {
                await userDocRef.set({
                    balance: 0, telegramId, username: fullName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastDailyClaim: null, lastSpin: null, spinCount: 0,
                    lastScratch: null, scratchCount: 0, referredBy: null
                });
                await handleReferral(userDocRef);
            }

            userDocRef.onSnapshot(snap => {
                if (snap.exists) {
                    const balance = snap.data().balance || 0;
                    document.getElementById('balance').innerText = balance;
                }
            }, err => console.error("Snapshot listener error:", err));
            
            setupReferralUI();
        });
    });

// Load Payment Methods
async function loadPaymentMethods() {
    const container = document.getElementById('paymentMethodsList');
    container.innerHTML = '';
    try {
        const snap = await db.collection('paymentMethods').get();
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div');
            div.className = 'payment-method';
            div.innerHTML = `
                <img class="payment-logo" src="${d.logoUrl}" alt="${d.name}">
                <div class="payment-info">
                    <h4>${d.name}</h4>
                    <p>লিমিট: ${d.min} - ${d.max} BDT</p>
                </div>
                <button class="payment-btn" onclick="openWithdraw('${doc.id}')">উইথড্র</button>
            `;
            container.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

let currentMethodId = null;
function openWithdraw(methodId) {
    currentMethodId = methodId;
    document.getElementById('withdrawModal').style.display = 'flex';
}

// Load Tasks
async function loadTasks() {
    const container = document.getElementById('taskList');
    container.innerHTML = '';
    try {
        const snap = await db.collection('tasks').get();
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div');
            div.className = 'task-item';
            div.innerHTML = `
                <h3>${d.name}</h3>
                <p>${d.description}</p>
                <p>পয়েন্ট: ${d.points} ৳</p>
                <p>লিমিট: ${d.limit} /দিন</p>
                <button class="task-btn" onclick="completeTask('${doc.id}', '${d.adNetwork}')" ${!isTaskCountry ? 'disabled title="শুধুমাত্র US/UK/CA ব্যবহারকারীদের জন্য উপলব্ধ।"' : ''}>কমপ্লিট</button>
            `;
            container.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

async function completeTask(taskId, adNetwork) {
    if (!isTaskCountry) return alert('এই ফিচারটি শুধুমাত্র US/UK/CA ব্যবহারকারীদের জন্য উপলব্ধ।');
    try {
        if (adNetwork === 'gigapub') await window.showGiga();
        else if (adNetwork === 'montage') montage.showAd(config.montageAppId, config.montageAdId);
        const taskSnap = await db.collection('tasks').doc(taskId).get();
        const points = taskSnap.data().points;
        await userDocRef.update({ balance: firebase.firestore.FieldValue.increment(points) });
        alert(`টাস্ক কমপ্লিট! ${points} ৳ পেয়েছেন`);
    } catch (e) { alert('টাস্ক ফেল: ' + e.message); }
}

// Spin Logic
async function loadSpinLimit() {
    const snap = await userDocRef.get();
    const today = new Date().toDateString();
    let spinCount = snap.data().spinCount || 0;
    const lastSpin = snap.data().lastSpin ? snap.data().lastSpin.toDate().toDateString() : '';
    if (lastSpin !== today) {
        spinCount = 0;
        await userDocRef.update({ spinCount: 0 });
    }
    document.getElementById('spinLimit').innerText = `${config.dailySpinLimit - spinCount} / ${config.dailySpinLimit} স্পিন বাকি`;
    return config.dailySpinLimit - spinCount;
}

document.getElementById('spinWheelBtn').onclick = async () => {
    if (!isTaskCountry) return alert('এই ফিচারটি শুধুমাত্র US/UK/CA ব্যবহারকারীদের জন্য উপলব্ধ।');
    const remaining = await loadSpinLimit();
    if (remaining <= 0) return alert('আজকের স্পিন লিমিট শেষ!');
    const wheel = document.getElementById('wheel');
    wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    const deg = 360 * 6 + Math.random() * 360;
    wheel.style.transform = `rotate(${deg}deg)`;
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

// Scratch Card Logic
let scratched = false;
function initScratchCard() {
    const canvas = document.getElementById('scratchCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 300; canvas.height = 200;
    ctx.fillStyle = '#999'; ctx.fillRect(0, 0, 300, 200);
    ctx.font = 'bold 22px Arial'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('স্ক্র্যাচ করুন', 150, 100);
    scratched = false;
    const card = document.getElementById('scratchCard');
    card.style.transform = 'rotateY(0deg)';

    let isDrawing = false;
    const startDraw = () => isDrawing = true;
    const stopDraw = () => { isDrawing = false; checkScratched(); };
    const draw = (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.fill();
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchend', stopDraw);
    canvas.addEventListener('touchmove', draw);

    function checkScratched() {
        const data = ctx.getImageData(0, 0, 300, 200).data;
        let transparent = 0;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] === 0) transparent++;
        }
        if (transparent > 18000 && !scratched) {
            scratched = true;
            card.style.transform = 'rotateY(180deg)';
        }
    }
}

async function loadScratchLimit() {
    const snap = await userDocRef.get();
    const today = new Date().toDateString();
    let scratchCount = snap.data().scratchCount || 0;
    const lastScratch = snap.data().lastScratch ? snap.data().lastScratch.toDate().toDateString() : '';
    if (lastScratch !== today) {
        scratchCount = 0;
        await userDocRef.update({ scratchCount: 0 });
    }
    document.getElementById('scratchLimit').innerText = `${config.dailyScratchLimit - scratchCount} / ${config.dailyScratchLimit} স্ক্র্যাচ বাকি`;
    return config.dailyScratchLimit - scratchCount;
}

document.getElementById('claimScratch').onclick = async () => {
    if (!isTaskCountry) return alert('এই ফিচারটি শুধুমাত্র US/UK/CA ব্যবহারকারীদের জন্য উপলব্ধ।');
    if (!scratched) return alert('প্রথমে স্ক্র্যাচ করুন!');
    const remaining = await loadScratchLimit();
    if (remaining <= 0) return alert('আজকের স্ক্র্যাচ লিমিট শেষ!');
    try {
        await window.showGiga();
        await userDocRef.update({
            balance: firebase.firestore.FieldValue.increment(config.scratchReward),
            lastScratch: firebase.firestore.FieldValue.serverTimestamp(),
            scratchCount: firebase.firestore.FieldValue.increment(1)
        });
        alert(`স্ক্র্যাচ রিওয়ার্ড! ${config.scratschReward} ৳ পেয়েছেন`);
        loadScratchLimit();
        initScratchCard();
    } catch (e) { alert('ক্লেইম ফেল: ' + e.message); }
};

// Daily Claim - GIGAPUB AD + ৳1
async function claimDaily() {
    if (!isTaskCountry) return alert('এই ফিচারটি শুধুমাত্র US/UK/CA ব্যবহারকারীদের জন্য উপলব্ধ।');

    try {
        const now = Date.now();
        const snap = await userDocRef.get();
        const last = snap.data().lastDailyClaim ? snap.data().lastDailyClaim.toMillis() : 0;

        if (now - last < config.dailyRewardCooldown) {
            const remaining = config.dailyRewardCooldown - (now - last);
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            alert(`${hours} ঘন্টা ${minutes} মিনিট পর আবার ক্লেইম করুন`);
            return;
        }

        // Show Gigapub Ad
        await window.showGiga();

        // Add ৳1 to balance
        await userDocRef.update({
            balance: firebase.firestore.FieldValue.increment(config.dailyRewardPoints),
            lastDailyClaim: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`ডেইলি রিওয়ার্ড! ৳${config.dailyRewardPoints} পেয়েছেন`);
    } catch (e) {
        alert('ডেইলি ক্লেইম ফেল: ' + e.message);
    }
}

// Withdraw
document.getElementById('closeModal').onclick = () => document.getElementById('withdrawModal').style.display = 'none';
document.getElementById('submitWithdraw').onclick = async () => {
    const amount = parseInt(document.getElementById('amount').value);
    const details = document.getElementById('paymentDetails').value.trim();
    if (isNaN(amount) || amount < config.minWithdraw || !details) return alert('সঠিক তথ্য দিন');
    try {
        const snap = await userDocRef.get();
        if (snap.data().balance < amount) return alert('আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই');
        await db.collection('withdrawals').add({
            userUid: auth.currentUser.uid, telegramId, username: fullName, amount, details,
            status: 'pending', requestedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await userDocRef.update({ balance: firebase.firestore.FieldValue.increment(-amount) });
        alert('উইথড্র রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে!');
        document.getElementById('withdrawModal').style.display = 'none';
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
        container.innerHTML = '<p style="color:red;">হিস্ট্রি লোড করতে সমস্যা হচ্ছে</p>';
    }
}
