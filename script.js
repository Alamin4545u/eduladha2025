document.addEventListener('DOMContentLoaded', function () {
    // === 1. Load Telegram Object ===
    const tg = window.Telegram.WebApp;
    if (!tg) {
        document.body.innerHTML = "<h1>Error: Please open this app inside Telegram.</h1>";
        console.error("Telegram context not found.");
        return;
    }

    tg.ready();
    tg.expand();

    // === 2. Collect all HTML elements ===
    const elements = {
        pointsDisplay: document.getElementById('points'),
        userIdDisplay: document.getElementById('user-id'),
        showAdButton: document.getElementById('show-ad-btn'),
        withdrawButton: document.getElementById('withdraw-btn'),
        historyButton: document.getElementById('history-btn'),
        messageDisplay: document.getElementById('message'),
        mainContainer: document.getElementById('main-container'),
        historyContainer: document.getElementById('history-container'),
        historyList: document.getElementById('history-list'),
        closeHistoryButton: document.getElementById('close-history-btn'),
    };

    // === 3. Firebase Config ===
    const firebaseConfig = {
        apiKey: "AIzaSyDtp3b0fdEvcjAPvmdupd00qDCbucyFIc0",
        authDomain: "mini-bot-735bf.firebaseapp.com",
        projectId: "mini-bot-735bf",
        storageBucket: "mini-bot-735bf.firebasestorage.app",
        messagingSenderId: "1056580233393",
        appId: "1:1056580233393:web:058609b1ca944020755a90",
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    let userId = null;
    let userDocRef = null;

    // === 4. Initialize App ===
    function initializeApp() {
        console.log("Checking Telegram initData:", tg.initDataUnsafe);

        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            userId = tg.initDataUnsafe.user.id;
            console.log("✅ Telegram user detected:", userId);
        } else {
            // fallback for testing outside Telegram
            console.warn("⚠️ Telegram user not found — running in test mode.");
            userId = "test_user_123";
            tg.initDataUnsafe = { user: { id: userId, username: "TestUser" } };
        }

        elements.userIdDisplay.innerText = `User ID: ${userId}`;
        userDocRef = db.collection('users').doc(String(userId));

        elements.showAdButton.disabled = false;
        elements.withdrawButton.disabled = false;
        elements.historyButton.disabled = false;

        loadUserData();
    }

    // === 5. Load user data from Firestore ===
    async function loadUserData() {
        try {
            const doc = await userDocRef.get();
            if (doc.exists) {
                const data = doc.data();
                elements.pointsDisplay.innerText = data.points || 0;
            } else {
                await userDocRef.set({
                    points: 0,
                    userId,
                    username: tg.initDataUnsafe.user.username || 'N/A'
                });
                elements.pointsDisplay.innerText = 0;
            }
            elements.messageDisplay.innerText = "";
        } catch (e) {
            elements.messageDisplay.innerText = "Error loading data.";
            console.error("Firebase Error:", e);
        }
    }

    // === 6. Show Ad & Earn Point ===
    function onShowAdClick() {
        elements.messageDisplay.innerText = "Loading ad...";
        elements.showAdButton.disabled = true;

        window.showGiga()
            .then(async () => {
                elements.messageDisplay.innerText = "Ad successful! Adding point...";
                await userDocRef.update({
                    points: firebase.firestore.FieldValue.increment(1)
                });
                elements.pointsDisplay.innerText =
                    (parseInt(elements.pointsDisplay.innerText, 10) || 0) + 1;
                elements.messageDisplay.innerText = "🎉 You earned 1 point!";
            })
            .catch(e => {
                console.error("Ad Error:", e);
                elements.messageDisplay.innerText = "Failed to show ad. Try again.";
            })
            .finally(() => {
                elements.showAdButton.disabled = false;
            });
    }

    // === 7. Request Withdrawal ===
    async function onWithdrawClick() {
        const currentPoints = parseInt(elements.pointsDisplay.innerText, 10) || 0;
        if (currentPoints <= 0) return alert("You do not have enough points.");
        if (!confirm(`Request withdrawal for ${currentPoints} points?`)) return;

        elements.withdrawButton.disabled = true;
        elements.messageDisplay.innerText = "Submitting withdrawal request...";

        try {
            await db.collection('withdrawal_requests').add({
                userId,
                username: tg.initDataUnsafe.user.username || 'N/A',
                points: currentPoints,
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await userDocRef.update({ points: 0 });
            elements.pointsDisplay.innerText = 0;
            alert("Withdrawal request submitted!");
            elements.messageDisplay.innerText = "✅ Request sent successfully.";
        } catch (e) {
            console.error("Withdrawal Error:", e);
            elements.messageDisplay.innerText = "Request failed. Please try again.";
        } finally {
            elements.withdrawButton.disabled = false;
        }
    }

    // === 8. Show Withdrawal History ===
    async function onHistoryClick() {
        elements.mainContainer.classList.add('hidden');
        elements.historyContainer.classList.remove('hidden');
        elements.historyList.innerHTML = '<p>Loading history...</p>';

        try {
            const query = await db.collection('withdrawal_requests')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .get();

            elements.historyList.innerHTML = '';
            if (query.empty) {
                elements.historyList.innerHTML = '<p>No history found.</p>';
                return;
            }

            query.forEach(doc => {
                const data = doc.data();
                const date = data.timestamp
                    ? new Date(data.timestamp.seconds * 1000).toLocaleString()
                    : 'N/A';
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div class="history-item-info">
                        <p class="points">${data.points} Points</p>
                        <p class="date">${date}</p>
                    </div>
                    <span class="status status-${data.status.toLowerCase()}">
                        ${data.status.toUpperCase()}
                    </span>
                `;
                elements.historyList.appendChild(item);
            });
        } catch (e) {
            console.error("History Error:", e);
            elements.historyList.innerHTML = '<p>Error fetching history.</p>';
        }
    }

    // === 9. Close history ===
    elements.closeHistoryButton.addEventListener('click', () => {
        elements.historyContainer.classList.add('hidden');
        elements.mainContainer.classList.remove('hidden');
    });

    // === 10. Add all Event Listeners ===
    elements.showAdButton.addEventListener('click', onShowAdClick);
    elements.withdrawButton.addEventListener('click', onWithdrawClick);
    elements.historyButton.addEventListener('click', onHistoryClick);

    // === 11. Wait and Initialize App ===
    setTimeout(initializeApp, 500);
});
