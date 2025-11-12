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

// Telegram WebApp Initialization
Telegram.WebApp.ready();
const tgUser = Telegram.WebApp.initDataUnsafe.user;

if (!tgUser) {
    document.body.innerHTML = "<h1 style='color:red;text-align:center;margin-top:50px;'>অনুগ্রহ করে টেলিগ্রাম অ্যাপ থেকে খুলুন!</h1>";
    throw new Error("Not a Telegram user");
}

const telegramId = tgUser.id.toString();
const username = tgUser.username || tgUser.first_name || 'ইউজার';
const fullName = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim();
const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const photoUrl = tgUser.photo_url || `https://ui-avatars.com/api/?name=${fullName.replace(' ', '+')}&background=random`;

// Global variables
const screens = document.querySelectorAll('.screen');
const navItems = document.querySelectorAll('.nav-item');
let userDocRef;
let config = { 
    minWithdraw: 500, dailyRewardPoints: 50, dailyRewardCooldown: 86400000, 
    liveNotice: 'আমাদের অ্যাপে স্বাগতম!', bannerUrls: [],
    dailySpinLimit: 1, spinReward: 100, dailyScratchLimit: 1, scratchReward: 50,
    vpnEnabled: false, referReward: 1, botUrl: 'https://t.me/YourBot/YourApp'
};

// Initial UI Setup
function initializeUI() {
    document.getElementById('avatar').innerText = initials;
    document.getElementById('userName').innerText = fullName;
    document.getElementById('userUsername').innerText = `@${username}`;
    document.getElementById('profileImgBig').src = photoUrl;
    document.getElementById('profileName').innerText = fullName;
    document.getElementById('telegramId').innerText = telegramId;
}

// Navigation Logic
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const screenId = item.dataset.screen;
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(screenId)?.classList.add('active');
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        
        if (screenId === 'history') loadHistory();
        if (screenId === 'task') loadTasks();
        if (screenId === 'wallet') loadPaymentMethods();
        if (screenId === 'spin') loadSpinLimit();
        if (screenId === 'scratch') { loadScratchLimit(); initScratchCard(); }
        if (screenId === 'refer') setupReferralUI();
    });
});

// Load App Configuration from Firestore
async function loadConfig() {
    try {
        const doc = await db.collection('config').doc('settings').get();
        if (doc.exists) {
            config = { ...config, ...doc.data() };
            const noticeSpan = document.getElementById('liveNotice').querySelector('span');
            noticeSpan.innerText = config.liveNotice;
            
            const container = document.getElementById('bannerContainer');
            container.innerHTML = '';
            config.bannerUrls.forEach((url) => {
                const img = document.createElement('img');
                img.className = 'banner';
                img.src = url;
                container.appendChild(img);
            });
        }
    } catch (e) { console.error("Config load error: ", e); }
}

// Handle Referrals for New Users
async function handleReferral(newUserDocRef) {
    const urlParams = new URLSearchParams(window.location.search);
    const startParam = urlParams.get('start');
    if (!startParam || !startParam.startsWith('REF_')) return;

    const referrerId = startParam.split('REF_')[1];
    if (!referrerId || referrerId === telegramId) return;

    const referrerDocRef = db.collection('users').doc(referrerId);
    const referrerDoc = await referrerDocRef.get();

    if (referrerDoc.exists) {
        await referrerDocRef.update({
            balance: firebase.firestore.FieldValue.increment(config.referReward)
        });
        await newUserDocRef.update({ referredBy: referrerId });
    }
}

// Setup Referral UI
function setupReferralUI() {
    document.getElementById('referralLink').value = `${config.botUrl}?start=REF_${telegramId}`;
    document.getElementById('referRewardAmount').innerText = config.referReward;
}

// Main Function to Initialize App
async function main() {
    initializeUI();
    await auth.signInAnonymously();
    
    auth.onAuthStateChanged(async user => {
        if (!user) return;
        
        userDocRef = db.collection('users').doc(telegramId);
        
        await loadConfig();

        const doc = await userDocRef.get();
        if (!doc.exists) {
            await userDocRef.set({
                telegramId, authUid: user.uid, username: fullName, balance: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastDailyClaim: null, lastSpin: null, spinCount: 0,
                lastScratch: null, scratchCount: 0, referredBy: null
            });
            await handleReferral(userDocRef);
        } else if (doc.data().authUid !== user.uid) {
            await userDocRef.update({ authUid: user.uid });
        }

        userDocRef.onSnapshot(snap => {
            if (snap.exists) {
                document.getElementById('balance').innerText = snap.data().balance || 0;
            }
        });
    });
}

// --- TASKS ---
async function loadTasks() {
    const container = document.getElementById('taskList');
    container.innerHTML = '<p>লোড হচ্ছে...</p>';
    try {
        const snap = await db.collection('tasks').get();
        if (snap.empty) {
            container.innerHTML = '<p style="text-align:center;">এখন কোনো টাস্ক উপলব্ধ নেই।</p>';
            return;
        }
        container.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement('div');
            div.className = 'task-item';
            div.innerHTML = `
                <h3>${d.name}</h3>
                <p>${d.description}</p>
                <p>পয়েন্ট: ${d.points} ৳</p>
                <p>লিমিট: ${d.limit} /দিন</p>
                <button class="task-btn" onclick="completeTask(${d.points})">কমপ্লিট করুন</button>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        console.error("Task load error:", e);
        container.innerHTML = '<p style="color:red;text-align:center;">টাস্ক লোড করতে সমস্যা হচ্ছে।</p>';
    }
}

async function completeTask(points) {
    try {
        await userDocRef.update({ balance: firebase.firestore.FieldValue.increment(points) });
        alert(`অভিনন্দন! আপনি ${points} ৳ পেয়েছেন।`);
    } catch (e) {
        alert('টাস্ক সম্পন্ন করতে একটি সমস্যা হয়েছে।');
        console.error("Complete task error:", e);
    }
}

// --- HISTORY ---
async function loadHistory() {
    const container = document.getElementById('historyList');
    container.innerHTML = '<p>লোড হচ্ছে...</p>';
    try {
        const snap = await db.collection('withdrawals')
            .where('telegramId', '==', telegramId)
            .orderBy('requestedAt', 'desc').get();

        if (snap.empty) {
            container.innerHTML = '<p style="color:#aaa;text-align:center;">কোনো হিস্ট্রি নেই</p>';
            return;
        }
        container.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const statusMap = { pending: 'পেন্ডিং', paid: 'পেইড', rejected: 'রিজেক্টেড' };
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div><strong>পরিমাণ:</strong> ৳ ${d.amount}</div>
                <div><strong>নম্বর:</strong> ${d.details}</div>
                <div><strong>তারিখ:</strong> ${new Date(d.requestedAt.toDate()).toLocaleString('bn-BD')}</div>
                <div><strong>স্ট্যাটাস:</strong> <span class="status-${d.status}">${statusMap[d.status] || d.status}</span></div>
            `;
            container.appendChild(div);
        });
    } catch (e) {
        console.error("History load error: ", e);
        container.innerHTML = '<p style="color:red;">হিস্ট্রি লোড করতে সমস্যা হচ্ছে।</p>';
    }
}

// --- DAILY CLAIM, SPIN, SCRATCH, WITHDRAW ---
// (This logic remains the same as before)

// Event Listeners
document.getElementById('copyReferralLink').addEventListener('click', () => {
    const linkInput = document.getElementById('referralLink');
    linkInput.select();
    navigator.clipboard.writeText(linkInput.value).then(() => alert('রেফারেল লিঙ্ক কপি করা হয়েছে!'));
});

document.getElementById('dailyClaim').addEventListener('click', () => {
    // This is where you put the logic for the daily claim
    alert('Daily Check clicked! Implement your logic here.');
});

document.getElementById('spinBtn').addEventListener('click', () => {
    // This button now navigates to the spin screen
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector('.nav-item[data-screen="spin"]').classList.add('active');
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById('spin').classList.add('active');
    loadSpinLimit();
});

document.getElementById('scratchBtn').addEventListener('click', () => {
    // This button now navigates to the scratch card screen
    navItems.forEach(item => item.classList.remove('active'));
    document.querySelector('.nav-item[data-screen="scratch"]').classList.add('active');
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById('scratch').classList.add('active');
    loadScratchLimit();
    initScratchCard();
});


// Run the app
main();
