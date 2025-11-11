// সম্পূর্ণ কোডটি একটি Main ফাংশনের মধ্যে রাখা হয়েছে যাতে কোনো গ্লোবাল ভ্যারিয়েবল সমস্যা না করে
function main() {
    // ১. টেলিগ্রাম অবজেক্টটি লোড করুন
    const tg = window.Telegram.WebApp;
    if (!tg) {
        document.body.innerHTML = "Error: Telegram context not found. Please open in Telegram.";
        console.error("Telegram WebApp is not available.");
        return;
    }

    // ২. HTML থেকে সব Element গুলো একবারে নিয়ে নিন
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

    // ৩. Firebase কনফিগারেশন
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

    // ৪. অ্যাপ ইনিশিয়ালাইজ করার মূল ফাংশন
    function initializeApp() {
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            userId = tg.initDataUnsafe.user.id;
            elements.userIdDisplay.innerText = `User ID: ${userId}`;
            userDocRef = db.collection('users').doc(String(userId));
            
            // ইউজার পাওয়া গেলে বাটনগুলো সক্রিয় করুন
            elements.showAdButton.disabled = false;
            elements.withdrawButton.disabled = false;
            elements.historyButton.disabled = false;
            
            loadUserData();
        } else {
            elements.userIdDisplay.innerText = "User ID not found. Please relaunch the app.";
            console.error("User data is not available from Telegram after initialization.");
        }
    }

    // ৫. ফায়ারবেস থেকে ডেটা লোড
    async function loadUserData() {
        try {
            const docSnap = await userDocRef.get();
            if (docSnap.exists) {
                elements.pointsDisplay.innerText = docSnap.data().points || 0;
            } else {
                await userDocRef.set({ points: 0, userId: userId, username: tg.initDataUnsafe.user.username || 'N/A' });
                elements.pointsDisplay.innerText = 0;
            }
        } catch (error) {
            console.error("Error loading user data:", error);
            elements.messageDisplay.innerText = `Error loading data.`;
        }
    }

    // ৬. সকল ইভেন্ট লিসেনার এখানে যোগ করা হয়েছে
    function addEventListeners() {
        elements.showAdButton.addEventListener('click', onShowAdClick);
        elements.withdrawButton.addEventListener('click', onWithdrawClick);
        elements.historyButton.addEventListener('click', onHistoryClick);
        elements.closeHistoryButton.addEventListener('click', () => {
            elements.historyContainer.classList.add('hidden');
            elements.mainContainer.classList.remove('hidden');
        });
    }

    // ৭. বাটন ক্লিকের ফাংশনগুলো
    function onShowAdClick() {
        elements.messageDisplay.innerText = "Loading ad...";
        elements.showAdButton.disabled = true;
        window.showGiga()
            .then(async () => {
                elements.messageDisplay.innerText = "Ad successful! Adding point...";
                await userDocRef.update({ points: firebase.firestore.FieldValue.increment(1) });
                elements.pointsDisplay.innerText = (parseInt(elements.pointsDisplay.innerText, 10) || 0) + 1;
                elements.messageDisplay.innerText = "Congratulations! You earned 1 point.";
            })
            .catch(e => { elements.messageDisplay.innerText = `Failed to show ad. Try again.`; })
            .finally(() => { elements.showAdButton.disabled = false; });
    }

    async function onWithdrawClick() {
        const currentPoints = parseInt(elements.pointsDisplay.innerText, 10) || 0;
        if (currentPoints <= 0) { return alert("You do not have enough points."); }
        if (!confirm(`Request withdrawal for ${currentPoints} points?`)) return;

        elements.withdrawButton.disabled = true;
        elements.messageDisplay.innerText = "Submitting request...";
        try {
            await db.collection('withdrawal_requests').add({
                userId: userId,
                username: tg.initDataUnsafe.user.username || 'N/A',
                points: currentPoints,
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await userDocRef.update({ points: 0 });
            elements.pointsDisplay.innerText = 0;
            alert("Withdrawal request submitted!");
            elements.messageDisplay.innerText = "Request sent.";
        } catch (error) {
            elements.messageDisplay.innerText = `Request failed.`;
        } finally {
            elements.withdrawButton.disabled = false;
        }
    }

    async function onHistoryClick() {
        elements.mainContainer.classList.add('hidden');
        elements.historyContainer.classList.remove('hidden');
        elements.historyList.innerHTML = '<p>Loading history...</p>';
        try {
            const query = await db.collection('withdrawal_requests')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc').get();
            
            if (query.empty) {
                elements.historyList.innerHTML = '<p>No history found.</p>';
                return;
            }
            elements.historyList.innerHTML = '';
            query.forEach(doc => {
                const data = doc.data();
                const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : 'N/A';
                const status = data.status || 'pending';
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `<div class="history-item-info"><p class="points">${data.points} Points</p><p class="date">${date}</p></div><span class="status status-${status.toLowerCase()}">${status.toUpperCase()}</span>`;
                elements.historyList.appendChild(item);
            });
        } catch (error) {
            elements.historyList.innerHTML = `<p>Error fetching history.</p>`;
        }
    }

    // ৮. অ্যাপ শুরু করার মূল ধাপ
    tg.expand();
    addEventListeners();
    tg.ready(initializeApp); // টেলিগ্রাম প্রস্তুত হলেই অ্যাপ ইনিশিয়ালাইজ হবে
}

// ডকুমেন্ট লোড হয়ে গেলে মেইন ফাংশনটি রান হবে
document.addEventListener('DOMContentLoaded', main);        try {
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
