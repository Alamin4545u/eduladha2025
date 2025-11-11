document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    if (!tg) {
        console.error("Telegram WebApp is not available.");
        document.body.innerHTML = "Please open this app inside Telegram.";
        return;
    }
    tg.ready();
    tg.expand();

    // HTML Elements
    const pointsDisplay = document.getElementById('points');
    const userIdDisplay = document.getElementById('user-id');
    const showAdButton = document.getElementById('show-ad-btn');
    const withdrawButton = document.getElementById('withdraw-btn');
    const messageDisplay = document.getElementById('message');
    const historyButton = document.getElementById('history-btn');
    const mainContainer = document.getElementById('main-container');
    const historyContainer = document.getElementById('history-container');
    const historyList = document.getElementById('history-list');
    const closeHistoryButton = document.getElementById('close-history-btn');

    // Firebase Configuration
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

    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        userId = tg.initDataUnsafe.user.id;
        userIdDisplay.innerText = `User ID: ${userId}`;
        userDocRef = db.collection('users').doc(String(userId));
        loadUserData();
    } else {
        userIdDisplay.innerText = "User ID not found.";
        console.error("User data not available from Telegram.");
        // বাটনগুলো নিষ্ক্রিয় করে দেওয়া হলো
        showAdButton.disabled = true;
        withdrawButton.disabled = true;
        historyButton.disabled = true;
        return;
    }

    async function loadUserData() {
        try {
            const docSnap = await userDocRef.get();
            if (docSnap.exists) {
                pointsDisplay.innerText = docSnap.data().points || 0;
            } else {
                await userDocRef.set({ points: 0, userId: userId, username: tg.initDataUnsafe.user.username || '' });
                pointsDisplay.innerText = 0;
            }
        } catch (error) {
            console.error("Error loading user data:", error);
            messageDisplay.innerText = `Error loading data: ${error.message}`;
        }
    }

    showAdButton.addEventListener('click', () => {
        messageDisplay.innerText = "Loading ad...";
        showAdButton.disabled = true;
        window.showGiga()
            .then(async () => {
                messageDisplay.innerText = "Ad successful! Adding point...";
                await userDocRef.update({ points: firebase.firestore.FieldValue.increment(1) });
                const currentPoints = parseInt(pointsDisplay.innerText, 10) || 0;
                pointsDisplay.innerText = currentPoints + 1;
                messageDisplay.innerText = "Congratulations! You earned 1 point.";
            })
            .catch(e => { messageDisplay.innerText = `Failed to show ad. Please try again.`; })
            .finally(() => { showAdButton.disabled = false; });
    });
    
    withdrawButton.addEventListener('click', async () => {
        const currentPoints = parseInt(pointsDisplay.innerText, 10) || 0;
        if (currentPoints <= 0) { return alert("You do not have enough points."); }
        if (!confirm(`Are you sure you want to request withdrawal for ${currentPoints} points?`)) return;

        withdrawButton.disabled = true;
        messageDisplay.innerText = "Submitting request...";
        try {
            await db.collection('withdrawal_requests').add({
                userId: userId,
                username: tg.initDataUnsafe.user.username || '',
                points: currentPoints,
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await userDocRef.update({ points: 0 });
            pointsDisplay.innerText = 0;
            alert("Your withdrawal request has been submitted successfully!");
            messageDisplay.innerText = "Withdrawal request sent.";
        } catch (error) {
            messageDisplay.innerText = `Request failed: ${error.message}`;
        } finally {
            withdrawButton.disabled = false;
        }
    });

    historyButton.addEventListener('click', async () => {
        mainContainer.classList.add('hidden');
        historyContainer.classList.remove('hidden');
        historyList.innerHTML = '<p>Loading history...</p>';
        try {
            const querySnapshot = await db.collection('withdrawal_requests')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .get();
            
            if (querySnapshot.empty) {
                historyList.innerHTML = '<p>No withdrawal history found.</p>';
                return;
            }
            historyList.innerHTML = '';
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : 'N/A';
                const status = data.status || 'pending';
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div class="history-item-info">
                        <p class="points">${data.points} Points</p>
                        <p class="date">${date}</p>
                    </div>
                    <span class="status status-${status.toLowerCase()}">${status.toUpperCase()}</span>`;
                historyList.appendChild(item);
            });
        } catch (error) {
            console.error("Error fetching history:", error);
            historyList.innerHTML = `<p>Error fetching history: ${error.message}</p>`;
        }
    });

    closeHistoryButton.addEventListener('click', () => {
        historyContainer.classList.add('hidden');
        mainContainer.classList.remove('hidden');
    });
});
