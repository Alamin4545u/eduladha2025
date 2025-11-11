document.addEventListener('DOMContentLoaded', () => {
    // ১. টেলিগ্রাম ওয়েব অ্যাপ ইনিশিয়ালাইজ করুন
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand(); // অ্যাপটি সম্পূর্ণ স্ক্রিনে দেখানোর জন্য

    // ২. HTML থেকে Element গুলো নিন
    const pointsDisplay = document.getElementById('points');
    const userIdDisplay = document.getElementById('user-id');
    const showAdButton = document.getElementById('show-ad-btn');
    const withdrawButton = document.getElementById('withdraw-btn');
    const messageDisplay = document.getElementById('message');

    // ৩. আপনার দেওয়া Firebase কনফিগারেশন
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
        messageDisplay.innerText = "Could not verify user. Please open via Telegram.";
        showAdButton.disabled = true;
        withdrawButton.disabled = true;
        return;
    }

    // ৫. Firebase থেকে ব্যবহারকারীর ডেটা লোড করার ফাংশন
    async function loadUserData() {
        try {
            const docSnap = await userDocRef.get();
            if (docSnap.exists()) {
                pointsDisplay.innerText = docSnap.data().points || 0;
            } else {
                // নতুন ব্যবহারকারী হলে ডেটাবেসে এন্ট্রি তৈরি করুন
                await userDocRef.set({ points: 0, userId: userId, username: tg.initDataUnsafe.user.username || '' });
                pointsDisplay.innerText = 0;
            }
        } catch (error) {
            console.error("Error loading user data:", error);
            messageDisplay.innerText = "Error loading your data.";
        }
    }

    // ৬. অ্যাড দেখানো এবং পয়েন্ট যোগ করার লজিক
    showAdButton.addEventListener('click', () => {
        messageDisplay.innerText = "Loading ad...";
        showAdButton.disabled = true;

        window.showGiga()
            .then(async () => {
                messageDisplay.innerText = "Congratulations! You earned 1 point.";
                
                // Firestore transaction ব্যবহার করে পয়েন্ট আপডেট করুন
                await userDocRef.update({
                    points: firebase.firestore.FieldValue.increment(1)
                });
                
                // UI তে নতুন পয়েন্ট দেখান
                const currentPoints = parseInt(pointsDisplay.innerText);
                pointsDisplay.innerText = currentPoints + 1;
            })
            .catch(e => {
                console.error("Ad error:", e);
                messageDisplay.innerText = "Failed to show ad. Please try again.";
            })
            .finally(() => {
                showAdButton.disabled = false; // বাটন আবার সক্রিয় করুন
            });
    });

    // ৭. পয়েন্ট উত্তোলনের অনুরোধ পাঠানোর লজিক
    withdrawButton.addEventListener('click', async () => {
        const pointsToWithdraw = prompt("How many points do you want to withdraw?", "50");
        if (!pointsToWithdraw || isNaN(pointsToWithdraw) || Number(pointsToWithdraw) <= 0) {
            alert("Please enter a valid number.");
            return;
        }

        const currentPoints = parseInt(pointsDisplay.innerText);
        const amount = Number(pointsToWithdraw);

        if (amount > currentPoints) {
            alert("You do not have enough points to withdraw.");
            return;
        }

        withdrawButton.disabled = true;
        messageDisplay.innerText = "Submitting request...";

        try {
            // Firestore-এ 'withdrawal_requests' নামে একটি নতুন কালেকশনে অনুরোধটি জমা দিন
            const requestId = `req_${userId}_${Date.now()}`;
            await db.collection('withdrawal_requests').doc(requestId).set({
                userId: userId,
                username: tg.initDataUnsafe.user.username || '',
                points: amount,
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // ব্যবহারকারীর অ্যাকাউন্ট থেকে পয়েন্ট কেটে নিন
            await userDocRef.update({
                points: firebase.firestore.FieldValue.increment(-amount)
            });

            // UI আপডেট করুন
            pointsDisplay.innerText = currentPoints - amount;
            alert("Your withdrawal request has been submitted successfully!");
            messageDisplay.innerText = "Withdrawal request sent.";

        } catch (error) {
            console.error("Error submitting withdrawal request:", error);
            messageDisplay.innerText = "Failed to submit request. Try again.";
        } finally {
            withdrawButton.disabled = false;
        }
    });
});
