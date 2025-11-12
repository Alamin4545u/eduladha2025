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
let userDocRef;
let config = { 
    minWithdraw: 500, dailyRewardPoints: 50, dailyRewardCooldown: 86400000, 
    liveNotice: 'আমাদের অ্যাপে স্বাগতম!', bannerUrls: [],
    dailySpinLimit: 1, spinReward: 100, dailyScratchLimit: 1, scratchReward: 50,
    referReward: 1, botUrl: 'https://t.me/YourBot/YourApp'
};

// DOM Elements Cache
const elements = {
    screens: document.querySelectorAll('.screen'),
    navItems: document.querySelectorAll('.nav-item'),
    avatar: document.getElementById('avatar'),
    userName: document.getElementById('userName'),
    userUsername: document.getElementById('userUsername'),
    balance: document.getElementById('balance'),
    profileImgBig: document.getElementById('profileImgBig'),
    profileName: document.getElementById('profileName'),
    telegramId: document.getElementById('telegramId'),
    liveNoticeSpan: document.getElementById('liveNotice').querySelector('span'),
    bannerContainer: document.getElementById('bannerContainer'),
    referralLink: document.getElementById('referralLink'),
    referRewardAmount: document.getElementById('referRewardAmount'),
    historyList: document.getElementById('historyList'),
    taskList: document.getElementById('taskList'),
    paymentMethodsList: document.getElementById('paymentMethodsList'),
    spinLimit: document.getElementById('spinLimit'),
    wheel: document.getElementById('wheel'),
    scratchLimit: document.getElementById('scratchLimit'),
    scratchCanvas: document.getElementById('scratchCanvas'),
    scratchCard: document.getElementById('scratchCard'),
    scratchReward: document.getElementById('scratchReward'),
    withdrawModal: document.getElementById('withdrawModal'),
    amountInput: document.getElementById('amount'),
    paymentDetailsInput: document.getElementById('paymentDetails'),
    // Buttons
    dailyClaimBtn: document.getElementById('dailyClaimBtn'),
    spinNavBtn: document.getElementById('spinNavBtn'),
    scratchNavBtn: document.getElementById('scratchNavBtn'),
    spinWheelBtn: document.getElementById('spinWheelBtn'),
    claimScratchBtn: document.getElementById('claimScratchBtn'),
    submitWithdrawBtn: document.getElementById('submitWithdraw'),
    closeModalBtn: document.getElementById('closeModal'),
    copyReferralLinkBtn: document.getElementById('copyReferralLink')
};

// --- CORE APP LOGIC ---

// Initialize the entire application
async function main() {
    initializeUI();
    await auth.signInAnonymously();
    
    auth.onAuthStateChanged(async user => {
        if (!user) return;
        
        userDocRef = db.collection('users').doc(telegramId);
        
        await loadConfig();
        await initializeUser(user);

        userDocRef.onSnapshot(snap => {
            if (snap.exists) {
                elements.balance.innerText = snap.data().balance || 0;
            }
        });
    });
}

// Set up the initial user interface elements
function initializeUI() {
    elements.avatar.innerText = initials;
    elements.userName.innerText = fullName;
    elements.userUsername.innerText = `@${username}`;
    elements.profileImgBig.src = photoUrl;
    elements.profileName.innerText = fullName;
    elements.telegramId.innerText = telegramId;
}

// Check if user exists, create if not
async function initializeUser(user) {
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
}

// --- NAVIGATION ---

// Switch between different screens
function navigateTo(screenId) {
    elements.screens.forEach(s => s.classList.remove('active'));
    document.getElementById(screenId)?.classList.add('active');
    elements.navItems.forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-screen="${screenId}"]`)?.classList.add('active');
}

elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
        const screenId = item.dataset.screen;
        navigateTo(screenId);
        
        // Load data specific to the screen
        switch(screenId) {
            case 'history': loadHistory(); break;
            case 'task': loadTasks(); break;
            case 'wallet': loadPaymentMethods(); break;
            case 'spin': loadSpinLimit(); break;
            case 'scratch': loadScratchLimit(); initScratchCard(); break;
            case 'refer': setupReferralUI(); break;
        }
    });
});

// --- DATA LOADING ---

async function loadConfig() {
    try {
        const doc = await db.collection('config').doc('settings').get();
        if (doc.exists) {
            config = { ...config, ...doc.data() };
            elements.liveNoticeSpan.innerText = config.liveNotice;
            elements.bannerContainer.innerHTML = '';
            config.bannerUrls.forEach(url => {
                const img = document.createElement('img');
                img.className = 'banner';
                img.src = url;
                elements.bannerContainer.appendChild(img);
            });
        }
    } catch (e) { console.error("Config load error: ", e); }
}

async function loadHistory() {
    elements.historyList.innerHTML = '<p>লোড হচ্ছে...</p>';
    try {
        const snap = await db.collection('withdrawals').where('telegramId', '==', telegramId).orderBy('requestedAt', 'desc').get();
        if (snap.empty) {
            elements.historyList.innerHTML = '<p style="text-align:center;">কোনো হিস্ট্রি নেই</p>';
            return;
        }
        elements.historyList.innerHTML = '';
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
            elements.historyList.appendChild(div);
        });
    } catch (e) {
        console.error("History load error:", e);
        elements.historyList.innerHTML = '<p style="color:red;">হিস্ট্রি লোড করতে সমস্যা হচ্ছে।</p>';
    }
}

// --- FEATURES ---

// Daily Check-in with Ad
async function handleDailyCheck() {
    elements.dailyClaimBtn.disabled = true;
    try {
        const now = Date.now();
        const doc = await userDocRef.get();
        const lastClaim = doc.data().lastDailyClaim ? doc.data().lastDailyClaim.toMillis() : 0;
        
        if (now - lastClaim < config.dailyRewardCooldown) {
            alert('আপনি ইতোমধ্যে আজকের রিওয়ার্ড নিয়েছেন।');
            return;
        }

        await window.showGiga(); // Show Ad First

        await userDocRef.update({
            balance: firebase.firestore.FieldValue.increment(config.dailyRewardPoints),
            lastDailyClaim: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert(`অভিনন্দন! আপনি ${config.dailyRewardPoints} ৳ পেয়েছেন।`);

    } catch (e) {
        alert('রিওয়ার্ড নিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
        console.error("Daily check error:", e);
    } finally {
        elements.dailyClaimBtn.disabled = false;
    }
}

// Spin Feature
async function handleSpinNavigation() {
    elements.spinNavBtn.disabled = true;
    try {
        await window.showGiga(); // Show Ad before navigating
        navigateTo('spin');
        loadSpinLimit();
    } catch(e) {
        alert('স্পিন পেজ খুলতে সমস্যা হয়েছে।');
        console.error("Spin navigation error:", e);
    } finally {
        elements.spinNavBtn.disabled = false;
    }
}

async function loadSpinLimit() {
    const doc = await userDocRef.get();
    const today = new Date().toDateString();
    let count = doc.data().spinCount || 0;
    if (doc.data().lastSpin?.toDate().toDateString() !== today) {
        count = 0;
        await userDocRef.update({ spinCount: 0 });
    }
    elements.spinLimit.innerText = `আজকের জন্য ${config.dailySpinLimit - count} / ${config.dailySpinLimit} স্পিন বাকি`;
    elements.spinWheelBtn.disabled = (config.dailySpinLimit - count <= 0);
}

async function executeSpin() {
    if (elements.spinWheelBtn.disabled) return;
    elements.spinWheelBtn.disabled = true;

    const deg = 360 * 5 + Math.random() * 360;
    elements.wheel.style.transform = `rotate(${deg}deg)`;

    setTimeout(async () => {
        try {
            await userDocRef.update({
                balance: firebase.firestore.FieldValue.increment(config.spinReward),
                lastSpin: firebase.firestore.FieldValue.serverTimestamp(),
                spinCount: firebase.firestore.FieldValue.increment(1)
            });
            alert(`অভিনন্দন! আপনি ${config.spinReward} ৳ জিতেছেন।`);
            loadSpinLimit();
        } catch (e) {
            console.error("Execute spin error:", e);
        }
    }, 4000);
}

// Scratch Card Feature
async function handleScratchNavigation() {
    elements.scratchNavBtn.disabled = true;
    try {
        await window.showGiga(); // Show Ad before navigating
        navigateTo('scratch');
        loadScratchLimit();
        initScratchCard();
    } catch(e) {
        alert('স্ক্র্যাচ কার্ড পেজ খুলতে সমস্যা হয়েছে।');
        console.error("Scratch navigation error:", e);
    } finally {
        elements.scratchNavBtn.disabled = false;
    }
}

async function loadScratchLimit() {
    // ... logic for loading scratch limit ...
}

function initScratchCard() {
    // ... logic for initializing scratch card ...
}

async function claimScratchReward() {
    // ... logic for claiming scratch reward ...
}


// --- EVENT LISTENERS ---
elements.dailyClaimBtn.addEventListener('click', handleDailyCheck);
elements.spinNavBtn.addEventListener('click', handleSpinNavigation);
elements.scratchNavBtn.addEventListener('click', handleScratchNavigation);
elements.spinWheelBtn.addEventListener('click', executeSpin);
elements.claimScratchBtn.addEventListener('click', claimScratchReward);
elements.copyReferralLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.referralLink.value).then(() => alert('লিঙ্ক কপি করা হয়েছে!'));
});
elements.closeModalBtn.addEventListener('click', () => elements.withdrawModal.style.display = 'none');
// ... add other event listeners for withdrawal, etc.

// Start the application
main();
