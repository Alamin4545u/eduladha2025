document.addEventListener('DOMContentLoaded', () => {
    // ১. টেলিগ্রাম ওয়েব অ্যাপ ইনিশিয়ালাইজ করুন
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // ২. HTML থেকে Element গুলো নিন
    const pointsDisplay = document.getElementById('points');
    const userIdDisplay = document.getElementById('user-id');
    const showAdButton = document.getElementById('show-ad-btn');
    const withdrawButton = document.getElementById('withdraw-btn');
    const messageDisplay = document.getElementById('message');

    // নতুন Element গুলো
    const historyButton = document.getElementById('history-btn');
    const mainContainer = document.getElementById('main-container');
    const historyContainer = document.getElementById('history-container');
    const historyList = document.getElementById('history-list');
    const closeHistoryButton = document.getElementById('close-history-btn');

    // ৩. Firebase কনফিগারেশন (আগের মতোই)
    const firebaseConfig = {
        apiKey: "AIzaSyDtp3b0fdEvcjAPvmdupd00qDCbucyFIc0",
        authDomain: "mini-bot-735bf.firebaseapp.com",
        projectId: "mini-bot-735bf",
        storageBucket: "mini-bot-735bf.firebasestorage.app",
        messagingSenderId: "1056580233393",
        appId: "1:1056580233393:web:058609b1ca944020755a90",
        measurementId: "G-L50J7R33WZ"
    };

    // ৪. Firebase অ্যাপ ইনিশিয়ালাইজ করুন
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
        messageDisplay.innerText = "Error: Could not verify user. Please open via Telegram.";
        showAdButton.disabled = true;
        withdrawButton.disabled = true;
        return;
    }

    // ৫. ব্যবহারকারীর ডেটা লোড করার ফাংশন (আগের মতোই)
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

    // ৬. অ্যাড দেখানো এবং পয়েন্ট যোগ করার লজিক (আগের মতোই)
    showAdButton.addEventListener('click', () => {
        messageDisplay.innerText = "Loading ad...";
        showAdButton.disabled = true;

        window.showGiga()
            .then(async () => {
                messageDisplay.innerText = "Ad successful! Adding point...";
                try {
                    await userDocRef.update({ points: firebase.firestore.FieldValue.increment(1) });
                    const currentPoints = parseInt(pointsDisplay.innerText, 10) || 0;
                    pointsDisplay.innerText = currentPoints + 1;
                    messageDisplay.innerText = "Congratulations! You earned 1 point.";
                } catch (error) {
                    messageDisplay.innerText = `Error saving point: ${error.message}`;
                }
            })
            .catch(e => { messageDisplay.innerText = `Failed to show ad. Please try again.`; })
            .finally(() => { showAdButton.disabled = false; });
    });
    
    // ৭. পয়েন্ট উত্তোলনের লজিক (আগের মতোই)
    withdrawButton.addEventListener('click', async () => {
        const currentPoints = parseInt(pointsDisplay.innerText, 10) || 0;
        if (currentPoints <= 0) {
            alert("You do not have enough points to withdraw.");
            return;
        }

        if (!confirm(`Are you sure you want to request withdrawal for ${currentPoints} points?`)) return;

        withdrawButton.disabled = true;
        messageDisplay.innerText = "Submitting request...";

        try {
            const requestId = `req_${userId}_${Date.now()}`;
            await db.collection('withdrawal_requests').doc(requestId).set({
                userId: userId,
                username: tg.initDataUnsafe.user.username || '',
                points: currentPoints,
                status: 'pending', // ডিফল্ট স্ট্যাটাস
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

    // ৮. নতুন: হিস্ট্রি দেখানোর ফাংশন
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

            historyList.innerHTML = ''; // আগের লিস্ট খালি করুন

            querySnapshot.forEach(doc => {
                const data = doc.data();
                const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : 'N/A';
                const status = data.status || 'pending'; // স্ট্যাটাস না থাকলে pending দেখাবে

                const item = document.createElement('div');
                item.classList.add('history-item');
                item.innerHTML = `
                    <div class="history-item-info">
                        <p class="points">${data.points} Points</p>
                        <p class="date">${date}</p>
                    </div>
                    <span class="status status-${status.toLowerCase()}">${status.toUpperCase()}</span>
                `;
                historyList.appendChild(item);
            });

        } catch (error) {
            console.error("Error fetching history:", error);
            historyList.innerHTML = `<p>Error fetching history: ${error.message}</p>`;
        }
    });

    // ৯. নতুন: হিস্ট্রি সেকশন বন্ধ করার ফাংশন
    closeHistoryButton.addEventListener('click', () => {
        historyContainer.classList.add('hidden');
        mainContainer.classList.remove('hidden');
    });
});            });

            await userDocRef.update({
                points: 0
            });

            pointsDisplay.innerText = 0;
            alert("Your withdrawal request has been submitted successfully!");
            messageDisplay.innerText = "Withdrawal request sent.";

        } catch (error) {
            console.error("Error submitting withdrawal request:", error);
            messageDisplay.innerText = `Request failed: ${error.message}`;
        } finally {
            withdrawButton.disabled = false;
        }
    });
});
