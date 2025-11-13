document.addEventListener('DOMContentLoaded', function() {
    // --- Firebase & Telegram Setup ---
    const firebaseConfig = {
        apiKey: "AIzaSyDW4TSXHbpP92hyeLvuBdSdVu56xKayTd8",
        authDomain: "test-dc90d.firebaseapp.com",
        databaseURL: "https://test-dc90d-default-rtdb.firebaseio.com",
        projectId: "test-dc90d",
        storageBucket: "test-dc90d.appspot.com",
        messagingSenderId: "804710782593",
        appId: "1:804710782593:web:48921608aad6d348afdf80",
        measurementId: "G-29YGNDZ2J4"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const tg = window.Telegram.WebApp;

    // --- Constants & Global Variables ---
    const BOT_USERNAME = "Bkash_earn_free_TkBot";
    const MINIMUM_WITHDRAW_AMOUNT = 10;
    const DAILY_REWARD = 1;
    let spinConfig = { dailyLimit: 5, rewardAmount: 1 };
    let currentUser, userRef, userData = {};
    let isSpinning = false;
    let currentRotation = 0;

    // --- UI Elements ---
    const screens = document.querySelectorAll('.screen');
    const navButtons = document.querySelectorAll('.nav-btn');
    const headerElements = { pic: document.getElementById('profilePic'), fullName: document.getElementById('headerFullName'), username: document.getElementById('headerUsername'), balance: document.getElementById('headerBalance') };
    const homeButtons = { dailyCheckin: document.getElementById('dailyCheckinBtn'), spin: document.getElementById('spinWheelBtn') };
    const spinScreenElements = {
        backBtn: document.getElementById('spinBackBtn'),
        triggerBtn: document.getElementById('spinTriggerBtn'),
        spinsLeft: document.getElementById('spinsLeft'),
        wheelGroup: document.getElementById('wheelGroup')
    };
    const walletElements = { balance: document.getElementById('withdrawBalance'), bkashNumber: document.getElementById('bkashNumber'), submitBtn: document.getElementById('submitWithdrawBtn') };
    const referElements = { linkInput: document.getElementById('referralLink'), shareBtn: document.getElementById('shareReferralBtn') };

    // --- Main Logic ---
    tg.ready();
    tg.expand();

    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        currentUser = tg.initDataUnsafe.user;
        userRef = db.collection('users').doc(currentUser.id.toString());
        fetchAdminSettings();
        fetchUserData();
        setupEventListeners();
        createSvgWheel();
    } else {
        document.body.innerHTML = "<h1>অনুগ্রহ করে টেলিগ্রাম অ্যাপ থেকে খুলুন।</h1>";
    }

    // --- SVG Wheel Creation ---
    function createSvgWheel() {
        const wheelGroup = spinScreenElements.wheelGroup;
        if (!wheelGroup) return;
        wheelGroup.innerHTML = ''; // Clear previous elements
        
        const numSegments = 10;
        const angle = 360 / numSegments;
        const colors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#d81b60', '#00acc1', '#fb8c00', '#5e35b1', '#6d4c41'];
        
        const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
            const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
            return {
                x: centerX + (radius * Math.cos(angleInRadians)),
                y: centerY + (radius * Math.sin(angleInRadians))
            };
        };

        // Create Segments
        for (let i = 0; i < numSegments; i++) {
            const startAngle = i * angle;
            const endAngle = startAngle + angle;
            const start = polarToCartesian(250, 250, 210, endAngle);
            const end = polarToCartesian(250, 250, 210, startAngle);
            const pathData = `M 250 250 L ${start.x} ${start.y} A 210 210 0 0 0 ${end.x} ${end.y} z`;
            
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            path.setAttribute("fill", colors[i]);
            path.setAttribute("stroke", "#8d6e63");
            path.setAttribute("stroke-width", "4");
            wheelGroup.appendChild(path);
        }
        
        // Create Sparkles
        for (let i = 0; i < numSegments; i++) {
            const sparkleAngle = (i * angle) + (angle / 2);
            const sparklePos = polarToCartesian(250, 250, 180, sparkleAngle);
            const sparkle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            sparkle.setAttribute("cx", sparklePos.x);
            sparkle.setAttribute("cy", sparklePos.y);
            sparkle.setAttribute("r", "5");
            sparkle.setAttribute("fill", "white");
            sparkle.setAttribute("filter", "url(#glow)");
            wheelGroup.appendChild(sparkle);
        }
    }

    // --- Data Fetch & UI Update ---
    function fetchAdminSettings() {
        db.collection('settings').doc('spinConfig').get().then(doc => {
            if (doc.exists) spinConfig = doc.data();
        }).catch(e => console.error("Could not fetch admin settings:", e));
    }

    function fetchUserData() {
        userRef.onSnapshot((doc) => {
            const today = new Date().toISOString().slice(0, 10);
            if (doc.exists) {
                userData = doc.data();
                if (!userData.spinsToday || userData.spinsToday.date !== today) {
                    userData.spinsToday = { date: today, count: 0 };
                }
            } else {
                const newUser = {
                    username: currentUser.username || '',
                    fullName: `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim(),
                    balance: 0,
                    lastCheckin: null,
                    spinsToday: { date: today, count: 0 }
                };
                userRef.set(newUser).then(() => userData = newUser);
            }
            updateUI();
        }, (error) => handleError("Failed to fetch user data.", error));
    }
    
    function getInitials(fullName) {
        if (!fullName) return '';
        const names = fullName.split(' ');
        const firstInitial = names[0] ? names[0][0] : '';
        const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
        return `${firstInitial}${lastInitial}`.toUpperCase();
    }

    function updateUI() {
        const balance = userData.balance || 0;
        const fullName = userData.fullName || currentUser.first_name;
        const username = userData.username || currentUser.id;
        const formattedBalance = `৳ ${balance.toFixed(2)}`;

        headerElements.balance.innerText = formattedBalance;
        headerElements.fullName.innerText = fullName;
        headerElements.username.innerText = username ? `@${username}` : `#${currentUser.id}`;
        headerElements.pic.innerText = getInitials(fullName);
        walletElements.balance.innerText = formattedBalance;
        walletElements.submitBtn.disabled = balance < MINIMUM_WITHDRAW_AMOUNT;
        walletElements.submitBtn.innerText = balance < MINIMUM_WITHDRAW_AMOUNT ? `ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন` : "উইথড্র সাবমিট করুন";
        referElements.linkInput.value = `https://t.me/${BOT_USERNAME}?start=${currentUser.id}`;
        const spinsLeftCount = spinConfig.dailyLimit - (userData.spinsToday?.count || 0);
        spinScreenElements.spinsLeft.innerText = spinsLeftCount > 0 ? spinsLeftCount : 0;
    }

    // --- Event Listeners & Handlers ---
    function setupEventListeners() {
        navButtons.forEach(btn => btn.addEventListener('click', (e) => showScreen(btn.dataset.screen)));
        homeButtons.dailyCheckin.addEventListener('click', handleDailyCheckin);
        homeButtons.spin.addEventListener('click', () => showScreen('spin-screen'));
        spinScreenElements.backBtn.addEventListener('click', () => showScreen('home-screen'));
        spinScreenElements.triggerBtn.addEventListener('click', handleSpin);
        walletElements.submitBtn.addEventListener('click', handleSubmitWithdraw);
        referElements.shareBtn.addEventListener('click', handleShareReferral);
    }
    
    function showScreen(screenId) {
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.screen === screenId));
    }

    function handleSpin() {
        if (isSpinning) return;
        const spinsLeftCount = spinConfig.dailyLimit - (userData.spinsToday?.count || 0);
        if (spinsLeftCount <= 0) {
            tg.showAlert("আপনার আজকের জন্য আর কোনো স্পিন বাকি নেই।");
            return;
        }
        isSpinning = true;
        spinScreenElements.triggerBtn.disabled = true;

        const randomExtraRotation = Math.floor(Math.random() * 360);
        const totalRotation = currentRotation + (360 * 5) + randomExtraRotation;
        
        spinScreenElements.wheelGroup.style.transform = `rotate(${totalRotation}deg)`;
        currentRotation = totalRotation;
        
        setTimeout(spinFinished, 5000);
    }
    
    function spinFinished() {
        tg.HapticFeedback.impactOccurred('light');
        window.showGiga().then(() => {
            tg.HapticFeedback.notificationOccurred('success');
            const today = new Date().toISOString().slice(0, 10);
            userRef.update({
                balance: firebase.firestore.FieldValue.increment(spinConfig.rewardAmount),
                'spinsToday.date': today,
                'spinsToday.count': firebase.firestore.FieldValue.increment(1)
            }).then(() => {
                tg.showAlert(`অভিনন্দন! স্পিন থেকে ৳ ${spinConfig.rewardAmount.toFixed(2)} পেয়েছেন।`);
            });
        }).catch(e => handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e))
        .finally(() => {
            isSpinning = false;
            spinScreenElements.triggerBtn.disabled = false;
            
            const finalRotation = currentRotation % 360;
            spinScreenElements.wheelGroup.style.transition = 'none';
            spinScreenElements.wheelGroup.style.transform = `rotate(${finalRotation}deg)`;
            currentRotation = finalRotation;
            
            setTimeout(() => {
                spinScreenElements.wheelGroup.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)';
            }, 50);
        });
    }

    function handleDailyCheckin() {
        const today = new Date().toISOString().slice(0, 10);
        if (userData.lastCheckin === today) {
            tg.showAlert("আপনি আজকের বোনাস ইতোমধ্যে সংগ্রহ করেছেন।");
            return;
        }
        this.disabled = true;
        tg.HapticFeedback.impactOccurred('light');
        window.showGiga().then(() => {
            tg.HapticFeedback.notificationOccurred('success');
            userRef.update({
                balance: firebase.firestore.FieldValue.increment(DAILY_REWARD),
                lastCheckin: today
            }).then(() => {
                tg.showAlert(`অভিনন্দন! Daily Check বোনাস হিসেবে ৳ ${DAILY_REWARD.toFixed(2)} পেয়েছেন।`);
            });
        }).catch(e => handleError("বিজ্ঞাপন দেখাতে সমস্যা হয়েছে।", e)).finally(() => { this.disabled = false; });
    }
    
    function handleSubmitWithdraw() {
        const bkashNumber = walletElements.bkashNumber.value.trim();
        if (bkashNumber.length < 11 || !/^\d+$/.test(bkashNumber) ) {
            tg.showAlert("অনুগ্রহ করে একটি সঠিক বিকাশ নম্বর দিন।");
            return;
        }
        if ((userData.balance || 0) < MINIMUM_WITHDRAW_AMOUNT) {
            tg.showAlert(`ন্যূনতম ৳${MINIMUM_WITHDRAW_AMOUNT} প্রয়োজন।`);
            return;
        }
        this.disabled = true;
        const amountToWithdraw = userData.balance;
        db.collection('withdrawals').add({
            userId: currentUser.id.toString(), username: currentUser.username || '', amount: amountToWithdraw, bkashNumber: bkashNumber, status: 'pending', timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            userRef.update({ balance: 0 }).then(() => {
                tg.showAlert("আপনার উইথড্র অনুরোধ সফলভাবে জমা হয়েছে।");
                showScreen('home-screen');
            });
        }).catch(e => handleError("উইথড্র অনুরোধে সমস্যা হয়েছে।", e)).finally(() => { 
            this.disabled = false; 
            walletElements.bkashNumber.value = ''; 
        });
    }

    function handleShareReferral() {
        const link = referElements.linkInput.value;
        const text = `এখানে প্রতিদিন আয় করুন! আমার রেফারেল লিংক দিয়ে জয়েন করুন: ${link}`;
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
    }

    function handleError(message, error) {
        if (error) console.error("Error:", error);
        if (typeof message === 'string') {
            tg.showAlert(message);
        } else {
            console.error("Snapshot Error:", message);
            tg.showAlert("একটি অপ্রত্যাশিত সমস্যা হয়েছে।");
        }
    }
});
