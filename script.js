// ধাপ ১: আপনার Firebase প্রজেক্টের কনফিগারেশন এখানে পেস্ট করুন
const firebaseConfig = {
  apiKey: "AIzaSyDW4TSXHbpP92hyeLvuBdSdVu56xKayTd8",
  authDomain: "test-dc90d.firebaseapp.com",
  databaseURL: "https://test-dc90d-default-rtdb.firebaseio.com",
  projectId: "test-dc90d",
  storageBucket: "test-dc90d.firebasestorage.app",
  messagingSenderId: "804710782593",
  appId: "1:804710782593:web:48921608aad6d348afdf80",
  measurementId: "G-29YGNDZ2J4"
};

// Firebase চালু করুন
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// টেলিগ্রাম ওয়েব অ্যাপ অবজেক্ট নিন
const tg = window.Telegram.WebApp;

document.addEventListener('DOMContentLoaded', function() {
    const balanceElement = document.getElementById('balance');
    const userIdElement = document.getElementById('userId');
    const showAdBtn = document.getElementById('showAdBtn');
    const withdrawBtn = document.getElementById('withdrawBtn');

    // ব্যবহারকারীর তথ্য লোড করুন
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        const userId = user.id.toString(); // আইডি স্ট্রিং হিসেবে রাখুন
        userIdElement.innerText = userId;

        const userRef = db.collection('users').doc(userId);

        // ব্যবহারকারীর ডেটা আনুন বা তৈরি করুন
        userRef.get().then((doc) => {
            if (doc.exists) {
                // যদি ব্যবহারকারী আগে থেকেই থাকে
                updateBalanceUI(doc.data().balance);
            } else {
                // নতুন ব্যবহারকারী হলে, ডেটাবেসে এন্ট্রি তৈরি করুন
                userRef.set({
                    username: user.username || '',
                    firstName: user.first_name || '',
                    balance: 0
                }).then(() => {
                    updateBalanceUI(0);
                });
            }
        }).catch((error) => {
            console.error("Error getting user data:", error);
            balanceElement.innerText = "ত্রুটি";
        });

        // বিজ্ঞাপন দেখার বাটনে ক্লিক ইভেন্ট
        showAdBtn.addEventListener('click', () => {
            // Gigapub এর showGiga() ফাংশন কল করুন
            window.showGiga()
                .then(() => {
                    // বিজ্ঞাপন সফলভাবে দেখা হলে
                    console.log("Ad watched successfully!");
                    const rewardAmount = 0.10; // প্রতিটি বিজ্ঞাপনের জন্য পুরস্কার (আপনি পরিবর্তন করতে পারেন)
                    
                    userRef.update({
                        balance: firebase.firestore.FieldValue.increment(rewardAmount)
                    }).then(() => {
                        // ডেটাবেস আপডেটের পর ব্যালেন্স আবার পড়ুন
                        userRef.get().then(doc => {
                           updateBalanceUI(doc.data().balance);
                           tg.HapticFeedback.notificationOccurred('success');
                        });
                    });
                })
                .catch(e => {
                    // যদি কোনো সমস্যা হয়
                    console.error("Ad failed to show:", e);
                    tg.showAlert('দুঃখিত, এই মুহূর্তে কোনো বিজ্ঞাপন উপলব্ধ নেই।');
                });
        });

        // উইথড্র বাটনে ক্লিক ইভেন্ট
        withdrawBtn.addEventListener('click', () => {
            // আপাতত একটি সাধারণ বার্তা দেখানো হচ্ছে
            // ভবিষ্যতে আপনি এখানে একটি ফর্ম বা অন্য কোনো সিস্টেম যোগ করতে পারেন
            tg.showAlert('উইথড্র সিস্টেমটি শীঘ্রই আসছে!');
        });

    } else {
        balanceElement.innerText = "টেলিগ্রামে খুলুন";
        showAdBtn.disabled = true;
        withdrawBtn.disabled = true;
    }

    // ব্যালেন্স UI আপডেট করার ফাংশন
    function updateBalanceUI(balance) {
        balanceElement.innerText = `৳${balance.toFixed(2)}`;
    }
});
