document.addEventListener('DOMContentLoaded', async function () {
    // --- Safety Check for Telegram Environment ---
    if (typeof Telegram === 'undefined' || !window.Telegram.WebApp) {
        document.getElementById('loader').innerHTML = `<div id="loader-message">Please open this app inside Telegram.</div>`;
        return;
    }
    
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- Firebase Configuration ---
    const firebaseConfig = {
      apiKey: "AIzaSyDtp3b0fdEvcjAPvmdupd00qDCbucyFIc0",
      authDomain: "mini-bot-735bf.firebaseapp.com",
      projectId: "mini-bot-735bf",
      storageBucket: "mini-bot-735bf.appspot.com",
      messagingSenderId: "1056580233393",
      appId: "1:1056580233393:web:058609b1ca944020755a90",
      measurementId: "G-L50J7R33WZ"
    };

    // --- Initialize Firebase (v8 SDK style) ---
    let db, auth, userRef, currentUserId;
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        auth = firebase.auth();
    } catch (e) {
        console.error("Firebase initialization failed:", e);
        document.getElementById('loader').innerHTML = `<div id="loader-message">Firebase configuration error.</div>`;
        return;
    }
    
    // --- ADMIN PANEL SIMULATION ---
    const adminSettings = {
        vpnRequired: false, // টেস্টিং এর জন্য false রাখা হয়েছে
        allowedCountries: ['US', 'UK', 'CA'],
        taskLimits: { spin: 10, scratch: 10, video: 10 },
        rewards: { dailyBonus: 1.00, spin: 0.50, scratch: 0.75, video: 0.25, videoTaskClaim: 1.25 },
        referralNotice: "Invite friends and get a reward!",
        rewardPerReferral: 1.50,
        botLink: "https://t.me/YourEarningBotName",
        minWithdrawal: 10.00
    };
    
    // --- App State (Default Structure) ---
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
    const scratchCardContainer = document.querySelector('.scratch-card-container');
    const watchAdButtons = document.querySelectorAll('.watch-ad-btn');
    const dailyClaimBtn = document.getElementById('daily-claim-btn');
    const withdrawBtn = document.querySelector('.withdraw-confirm-btn');
    const historyContainer = document.getElementById('history-list-container');
    const protectedNavs = { 'nav-spin': 'spin-page', 'nav-scratch': 'scratch-page', 'nav-video': 'watch-video-page' };
    const pageSwitchers = document.querySelectorAll('.page-switcher');

    let isSpinning = false;
    let currentRotation = 0;
    
    // --- Main Functions ---
    const showApp = () => { loader.style.display = 'none'; appContainer.style.display = 'flex'; bottomNav.style.display = 'flex'; };
    const updateBalanceDisplay = () => allBalanceElements.forEach(el => el.textContent = `$${userData.balance.toFixed(2)}`);
    const saveUserData = async () => { if (userRef) await userRef.set(userData, { merge: true }); };

    const loadUserData = async (firebaseUser) => {
        currentUserId = tg.initDataUnsafe?.user?.id || firebaseUser.uid;
        userRef = db.collection('users').doc(String(currentUserId));
        const doc = await userRef.get();
        if (doc.exists) {
            const fetchedData = doc.data();
            // userData অবজেক্টকে fetchedData দিয়ে আপডেট করা হচ্ছে
            userData = {
                ...userData,
                ...fetchedData,
                taskProgress: {
                    ...userData.taskProgress,
                    ...(fetchedData.taskProgress || {}),
                    video: {
                        ...userData.taskProgress.video,
                        ...((fetchedData.taskProgress || {}).video || {})
                    }
                }
            };
        } else {
            if (tg.initDataUnsafe?.user) userData.telegramId = tg.initDataUnsafe.user.id;
            await saveUserData();
        }
        updateUIWithLoadedData();
    };

    const updateUIWithLoadedData = () => {
        updateBalanceDisplay();
        updateTaskCounter('spin', userData.taskProgress.spin);
        updateTaskCounter('scratch', userData.taskProgress.scratch);
        initializeVideoTasks();
        const lastClaimDate = userData.lastClaim ? new Date(userData.lastClaim).toDateString() : null;
        if (lastClaimDate === new Date().toDateString()) {
            dailyClaimBtn.textContent = 'Claimed';
            dailyClaimBtn.disabled = true;
        }
    };

    const switchPage = (targetPageId) => {
        if (!document.getElementById(targetPageId)) return;
        allPages.forEach(page => page.classList.remove('active-page'));
        document.getElementById(targetPageId).classList.add('active-page');
        allNavItems.forEach(nav => nav.classList.toggle('active', nav.dataset.target === targetPageId));
        if (targetPageId === 'history-page') {
            loadWithdrawalHistory();
        }
    };
    
    const checkVpnAndProceed = async (button, action) => {
        if (!adminSettings.vpnRequired) {
            action();
            return;
        }
        button.disabled = true;
        button.textContent = 'Checking...';
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            if (adminSettings.allowedCountries.includes(data.country_code)) {
                action();
            } else {
                tg.showAlert('This task requires a VPN connection from a specific country (e.g., US, UK, CA).');
            }
        } catch (error) {
            tg.showAlert('Could not verify location. Please check your internet connection.');
        } finally {
            button.disabled = false;
        }
    };

    const showGigaAd = (callback, button) => {
        const ad_container = document.createElement("div");
        ad_container.id = "giga-ad-container";
        document.body.appendChild(ad_container);
        giga_fullscreen_Ad.showAd({
            'container': 'giga-ad-container',
            'finish_callback': () => {
                document.body.removeChild(ad_container);
                callback();
            },
            'close_callback': () => {
                document.body.removeChild(ad_container);
                tg.showAlert("You must watch the ad to get the reward.");
            }
        });
    };
    
    const populateUserData = () => {
        const user = tg.initDataUnsafe?.user;
        const name = user?.first_name || 'User';
        const username = user?.username ? `@${user.username}` : '@username';
        document.getElementById('user-name').textContent = name;
        document.getElementById('user-username').textContent = username;
        document.getElementById('profile-name').textContent = name;
        document.getElementById('profile-username').textContent = username;
        if (user) document.getElementById('referral-link').value = `${adminSettings.botLink}?start=${user.id}`;
    };

    const updateTaskCounter = (taskName, progress) => {
        const counterElement = document.getElementById(`${taskName}-counter`);
        if (counterElement) {
            counterElement.textContent = `${progress || 0}/${adminSettings.taskLimits[taskName]}`;
        }
    };
    
    const initializeVideoTasks = () => {
        document.querySelectorAll('.video-task-card').forEach(card => {
            const taskId = card.dataset.taskId;
            const progress = userData.taskProgress.video[taskId] || 0;
            updateVideoTaskUI(card, progress);
        });
    };

    const updateVideoTaskUI = (card, progress) => {
        const taskId = card.dataset.taskId;
        const progressText = card.querySelector('.progress-text');
        const progressBlocksContainer = card.querySelector('.progress-blocks');
        const watchBtn = card.querySelector('.watch-ad-btn');
        const claimBtn = card.querySelector('.claim-reward-btn');

        progressText.textContent = `${progress}/10`;
        progressBlocksContainer.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const block = document.createElement('div');
            block.className = 'progress-block' + (i < progress ? ' completed' : '');
            progressBlocksContainer.appendChild(block);
        }

        if (progress >= 10) {
            watchBtn.style.display = 'none';
            claimBtn.style.display = 'block';
            if (userData.taskProgress.video[`${taskId}_claimed`]) {
                claimBtn.textContent = 'Claimed';
                claimBtn.disabled = true;
            } else {
                claimBtn.textContent = 'Claim Reward';
                claimBtn.disabled = false;
            }
        } else {
            watchBtn.style.display = 'block';
            claimBtn.style.display = 'none';
        }
    };

    const loadWithdrawalHistory = async () => {
        historyContainer.innerHTML = '<div class="spinner"></div>';
        try {
            const querySnapshot = await db.collection('withdrawals')
                .where('userId', '==', String(currentUserId))
                .orderBy('timestamp', 'desc')
                .get();

            if (querySnapshot.empty) {
                historyContainer.innerHTML = `<p class="no-history-message">You have no withdrawal history.</p>`;
                return;
            }

            let historyHtml = '';
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const date = new Date(data.timestamp.seconds * 1000).toLocaleString();
                const statusClass = data.status.toLowerCase();
                historyHtml += `
                    <div class="history-item">
                        <div class="history-details">
                            <h4>${data.method}</h4>
                            <p>${date}</p>
                        </div>
                        <div class="history-status">
                            <p class="amount">$${data.amount.toFixed(2)}</p>
                            <span class="status-badge ${statusClass}">${data.status}</span>
                        </div>
                    </div>
                `;
            });
            historyContainer.innerHTML = historyHtml;

        } catch (error) {
            console.error("Error fetching withdrawal history: ", error);
            historyContainer.innerHTML = `<p class="no-history-message">Could not load history. Please try again.</p>`;
        }
    };

    // --- Event Listeners ---
    allNavItems.forEach(item => {
        const targetPageId = item.dataset.target;
        if (!Object.values(protectedNavs).includes(targetPageId)) {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchPage(targetPageId);
            });
        }
    });
    
    pageSwitchers.forEach(button => button.addEventListener('click', () => switchPage(button.dataset.target)));
    
    Object.entries(protectedNavs).forEach(([buttonId, pageId]) => {
        const buttonElement = document.getElementById(buttonId);
        if (buttonElement) {
            buttonElement.addEventListener('click', (e) => {
                e.preventDefault();
                checkVpnAndProceed(buttonElement, () => {
                    switchPage(pageId);
                    tg.HapticFeedback.selectionChanged();
                });
            });
        }
    });

    dailyClaimBtn.addEventListener('click', (e) => {
        checkVpnAndProceed(e.target, () => {
            const lastClaimDate = userData.lastClaim ? new Date(userData.lastClaim).toDateString() : null;
            if (lastClaimDate === new Date().toDateString()) {
                tg.showAlert("You have already claimed today's bonus.");
                return;
            }
            showGigaAd(async () => {
                userData.balance += adminSettings.rewards.dailyBonus;
                userData.lastClaim = new Date().toISOString();
                await saveUserData();
                updateBalanceDisplay();
                tg.showAlert(`Daily bonus of $${adminSettings.rewards.dailyBonus.toFixed(2)} has been added!`);
                e.target.textContent = 'Claimed';
                e.target.disabled = true;
            }, e.target);
        });
    });

    withdrawBtn.addEventListener('click', async () => {
        const amount = parseFloat(document.getElementById('amount').value);
        const method = document.getElementById('method').value;
        const accountNumber = document.getElementById('account-number').value;

        if (isNaN(amount) || amount <= 0) {
            tg.showAlert('Please enter a valid amount.'); return;
        }
        if (amount < adminSettings.minWithdrawal) {
            tg.showAlert(`Minimum withdrawal amount is $${adminSettings.minWithdrawal.toFixed(2)}.`); return;
        }
        if (amount > userData.balance) {
            tg.showAlert("You don't have enough balance."); return;
        }
        if (!accountNumber.trim()) {
            tg.showAlert('Please enter your account number.'); return;
        }

        withdrawBtn.disabled = true;
        withdrawBtn.textContent = 'Processing...';

        try {
            const withdrawalRequest = {
                userId: String(currentUserId),
                amount: amount,
                method: method,
                accountNumber: accountNumber,
                status: 'Pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('withdrawals').add(withdrawalRequest);

            userData.balance -= amount;
            await saveUserData();
            updateBalanceDisplay();
            
            tg.showAlert('Your withdrawal request has been submitted successfully!');
            document.getElementById('amount').value = '';
            document.getElementById('account-number').value = '';

        } catch (error) {
            console.error("Withdrawal failed: ", error);
            tg.showAlert('Something went wrong. Please try again.');
        } finally {
            withdrawBtn.disabled = false;
            withdrawBtn.textContent = 'Confirm Request';
        }
    });

    watchAdButtons.forEach(button => {
        button.addEventListener('click', e => {
            const card = e.target.closest('.video-task-card');
            const taskId = card.dataset.taskId;
            if (userData.taskProgress.video[taskId] >= 10) {
                tg.showAlert("You have completed this task.");
                return;
            }
            showGigaAd(async () => {
                userData.taskProgress.video[taskId]++;
                await saveUserData();
                updateVideoTaskUI(card, userData.taskProgress.video[taskId]);
                tg.HapticFeedback.notificationOccurred('success');
            }, e.target);
        });
    });
    
    document.querySelectorAll('.claim-reward-btn').forEach(button => {
        button.addEventListener('click', async e => {
            const card = e.target.closest('.video-task-card');
            const taskId = card.dataset.taskId;
            if (userData.taskProgress.video[`${taskId}_claimed`]) {
                tg.showAlert('Reward already claimed.');
                return;
            }
            userData.balance += adminSettings.rewards.videoTaskClaim;
            userData.taskProgress.video[`${taskId}_claimed`] = true;
            await saveUserData();
            updateBalanceDisplay();
            updateVideoTaskUI(card, 10);
            tg.showAlert(`Reward of $${adminSettings.rewards.videoTaskClaim.toFixed(2)} claimed!`);
        });
    });

    spinBtn.addEventListener('click', (e) => {
        if (isSpinning) return;
        if (userData.taskProgress.spin >= adminSettings.taskLimits.spin) {
            tg.showAlert("You have reached your spin limit for today.");
            return;
        }
        showGigaAd(() => {
            isSpinning = true;
            const randomDegrees = Math.floor(Math.random() * 360) + 360 * 5;
            currentRotation += randomDegrees;
            spinWheel.style.transform = `rotate(${currentRotation}deg)`;
            setTimeout(async () => {
                isSpinning = false;
                userData.taskProgress.spin++;
                userData.balance += adminSettings.rewards.spin;
                await saveUserData();
                updateBalanceDisplay();
                updateTaskCounter('spin', userData.taskProgress.spin);
                tg.showAlert(`You won $${adminSettings.rewards.spin.toFixed(2)}!`);
                tg.HapticFeedback.notificationOccurred('success');
            }, 2000);
        }, e.target);
    });

    scratchCardContainer.addEventListener('click', () => {
        if (scratchCardContainer.classList.contains('is-flipped')) return;
        if (userData.taskProgress.scratch >= adminSettings.taskLimits.scratch) {
            tg.showAlert("You have reached your scratch limit for today.");
            return;
        }
        showGigaAd(() => {
            scratchCardContainer.classList.add('is-flipped');
            setTimeout(async () => {
                userData.taskProgress.scratch++;
                userData.balance += adminSettings.rewards.scratch;
                await saveUserData();
                updateBalanceDisplay();
                updateTaskCounter('scratch', userData.taskProgress.scratch);
                tg.showAlert(`You won $${adminSettings.rewards.scratch.toFixed(2)}!`);
                tg.HapticFeedback.notificationOccurred('success');
                setTimeout(() => scratchCardContainer.classList.remove('is-flipped'), 2000);
            }, 1000);
        }, scratchCardContainer);
    });
    
    // --- Initial App Logic ---
    async function main() {
        try {
            const userCredential = await auth.signInAnonymously();
            const firebaseUser = userCredential.user;

            if (firebaseUser) {
                await loadUserData(firebaseUser);
                populateUserData();
                document.getElementById('referral-notice').textContent = adminSettings.referralNotice;
                document.getElementById('referral-reward-info').textContent = `$${adminSettings.rewardPerReferral.toFixed(2)}`;
                showApp();
            } else {
                throw new Error("Anonymous authentication failed.");
            }
        } catch (error) {
            console.error("Critical Error:", error);
            const loaderMessage = document.getElementById('loader-message');
            loaderMessage.textContent = "Failed to load. Please check Firebase config, security rules, and enable Anonymous Sign-in.";
            loaderMessage.style.display = 'block';
            document.querySelector('.spinner').style.display = 'none';
        }
    }
    main();
});
