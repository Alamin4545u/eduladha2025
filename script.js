document.addEventListener('DOMContentLoaded', async function () {
    // --- Safety Check for Telegram Environment ---
    if (typeof Telegram === 'undefined' || !window.Telegram.WebApp) {
        document.body.innerHTML = `<div style="text-align: center; padding: 50px; color: white; font-size: 18px;">Please open this app inside Telegram.</div>`;
        return;
    }
    
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- Firebase Configuration ---
    // !!! গুরুত্বপূর্ণ: অনুগ্রহ করে এখানে আপনার সত্যিকারের Firebase প্রজেক্টের কনফিগারেশন কোড ব্যবহার করুন !!!
    const firebaseConfig = {
        apiKey: "AIzaSyBidXnyxl4LjnRW6z5PrQ_iOKzqjjrxRtM",
        authDomain: "comexaple.firebaseapp.com",
        projectId: "comexaple",
        storageBucket: "comexaple.firebasestorage.app",
        messagingSenderId: "799294329351",
        appId: "1:799294329351:web:0bb9620bc1d227a29650a2",
        measurementId: "G-LRBREF5QV6"
    };

    // --- Initialize Firebase ---
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
    let userRef;

    // --- ADMIN PANEL SIMULATION ---
    const adminSettings = {
        vpnRequired: true,
        allowedCountries: ['US', 'UK', 'CA'],
        taskLimits: { spin: 10, scratch: 10, video: 10 },
        rewards: { dailyBonus: 1.00, spin: 0.50, scratch: 0.75, video: 0.25 },
        referralNotice: "Invite friends and get a reward!",
        rewardPerReferral: 1.50,
        botLink: "https://t.me/YourEarningBotName"
    };
    
    // --- App State ---
    let userData = {
        balance: 0.00,
        lastClaim: null,
        taskProgress: { spin: 0, scratch: 0, video: { task1: 0, task2: 0, task3: 0 }}
    };

    // --- Element References ---
    const loader = document.getElementById('loader');
    const appContainer = document.querySelector('.app-container');
    const bottomNav = document.querySelector('.bottom-nav');
    const allPages = document.querySelectorAll('.page-content');
    const allNavItems = document.querySelectorAll('.nav-item');
    const allBalanceElements = document.querySelectorAll('.balance-amount');
    const spinWheel = document.querySelector('.spinner-wheel');
    const spinBtn = document.getElementById('spin-btn');
    const scratchCard = document.querySelector('.scratch-card-container');
    const watchAdButtons = document.querySelectorAll('.watch-ad-btn');
    const dailyClaimBtn = document.getElementById('daily-claim-btn');
    const protectedNavs = { 'nav-spin': 'spin-page', 'nav-scratch': 'scratch-page', 'nav-video': 'watch-video-page' };
    const pageSwitchers = document.querySelectorAll('.page-switcher');

    let isSpinning = false;
    let currentRotation = 0;
    
    // --- Main Functions ---
    const showApp = () => { loader.style.display = 'none'; appContainer.style.display = 'flex'; bottomNav.style.display = 'flex'; };
    const updateBalanceDisplay = () => allBalanceElements.forEach(el => el.textContent = `$${userData.balance.toFixed(2)}`);
    const saveUserData = async () => { if (userRef) await userRef.set(userData, { merge: true }); };

    const loadUserData = async (firebaseUser) => {
        const userId = firebaseUser.uid; // Use Firebase UID as the document ID
        userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();
        if (doc.exists) {
            const fetchedData = doc.data();
            userData = { ...userData, ...fetchedData, taskProgress: { ...userData.taskProgress, ...fetchedData.taskProgress }};
        } else {
            // If it's a new user, also store their Telegram ID if available
            if (tg.initDataUnsafe?.user) {
                userData.telegramId = tg.initDataUnsafe.user.id;
            }
            await saveUserData();
        }
        updateUIWithLoadedData();
    };
    
    // ... (All other functions remain the same: updateUIWithLoadedData, switchPage, checkVpnAndProceed, etc.)

    // --- Initial App Logic ---
    async function main() {
        try {
            // Step 1: Authenticate user anonymously with Firebase
            const userCredential = await auth.signInAnonymously();
            const firebaseUser = userCredential.user;

            if (firebaseUser) {
                // Step 2: Load or create user data in Firestore
                await loadUserData(firebaseUser);
                
                // Step 3: Populate UI with user-specific data from Telegram
                populateUserData();
                
                // Step 4: Show the main application
                showApp();
            } else {
                throw new Error("Could not authenticate user.");
            }
        } catch (error) {
            console.error("Firebase Initialization Error:", error);
            document.getElementById('loader').innerHTML = `<div style="text-align: center; padding: 20px; color: red;">Failed to load. Please check your Firebase setup and security rules.</div>`;
        }
        
        // Setup admin-controlled UI elements
        populateAdminSettings();
    }

    main(); // Start the application
});
