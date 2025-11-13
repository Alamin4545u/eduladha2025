document.addEventListener('DOMContentLoaded', function() {
    const firebaseConfig = {
        apiKey: "AIzaSyDW4TSXHbpP92hyeLvuBdSdVu56xKayTd8",
        authDomain: "test-dc90d.firebaseapp.com",
        databaseURL: "https://test-dc90d-default-rtdb.firebaseio.com",
        projectId: "test-dc90d",
        storageBucket: "test-dc90d.appspot.com",
        messagingSenderId: "804710782593",
        appId: "1:804710782593:web:48921608aad6d348afdf80"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const tg = window.Telegram.WebApp;

    // --- Global ---
    const BOT_USERNAME = "Bkash_earn_free_TkBot";
    let currentUser, userRef, userData = {};
    let isSpinning = false;
    let currentRotation = 0;
    const numSegments = 10;
    const anglePerSegment = 360 / numSegments;

    // --- UI Elements ---
    const screens = document.querySelectorAll('.screen');
    const navButtons = document.querySelectorAll('.nav-btn');
    const headerElements = { balance: document.getElementById('headerBalance'), fullName: document.getElementById('headerFullName'), username: document.getElementById('headerUsername'), pic: document.getElementById('profilePic') };
    const spinElements = { triggerBtn: document.getElementById('spinTriggerBtn'), spinsLeft: document.getElementById('spinsLeft'), wheelGroup: document.getElementById('wheelGroup'), svgWheel: document.getElementById('svgWheel') };
    const walletElements = { balance: document.getElementById('withdrawBalance'), minWithdraw: document.getElementById('minWithdraw'), methodSelect: document.getElementById('paymentMethod'), accountInput: document.getElementById('accountNumber'), submitBtn: document.getElementById('submitWithdrawBtn') };
    const referElements = { link: document.getElementById('referralLink'), shareBtn: document.getElementById('shareReferralBtn'), reward: document.getElementById('referReward') };
    const taskList = document.getElementById('taskList');
    const historyList = document.getElementById('historyList');

    // --- Admin Settings ---
    let adminSettings = {
        dailyReward: 1,
        spinConfig: { dailyLimit: 5, rewardAmount: 1 },
        referReward: 2,
        minWithdraw: 10,
        paymentMethods: []
    };

    // --- Init ---
    tg.ready(); tg.expand();
    if (tg.initDataUnsafe?.user) {
        currentUser = tg.initDataUnsafe.user;
        userRef = db.collection('users').doc(currentUser.id.toString());
        fetchAdminSettings();
        fetchUserData();
        setupEventListeners();
        createSvgWheel();
    } else {
        document.body.innerHTML = "<h1>টেলিগ্রাম থেকে খুলুন</h1>";
    }

    // --- Fetch Admin Settings ---
    function fetchAdminSettings() {
        db.collection('settings').doc('dailyCheck').get().then(doc => {
            if (doc.exists) adminSettings.dailyReward = doc.data().reward || 1;
        });
        db.collection('settings').doc('spinConfig').get().then(doc => {
            if (doc.exists) adminSettings.spinConfig = doc.data();
        });
        db.collection('settings').doc('referConfig').get().then(doc => {
            if (doc.exists) adminSettings.referReward = doc.data().reward || 2;
            referElements.reward.innerText = `৳ ${adminSettings.referReward}`;
        });
        db.collection('settings').doc('withdrawConfig').get().then(doc => {
            if (doc.exists) {
                adminSettings.minWithdraw = doc.data().minAmount || 10;
                walletElements.minWithdraw.innerText = `৳ ${adminSettings.minWithdraw}`;
            }
        });
        db.collection('paymentMethods').orderBy('name').onSnapshot(snapshot => {
            adminSettings.paymentMethods = [];
            walletElements.methodSelect.innerHTML = '';
            snapshot.forEach(doc => {
                const method = doc.data();
                adminSettings.paymentMethods.push(method);
                const opt = document.createElement('option');
                opt.value = method.name;
                opt.textContent = `${method.name} (${method.example})`;
                walletElements.methodSelect.appendChild(opt);
            });
        });
        loadTasks();
        loadHistory();
    }

    // --- Load Tasks ---
    function loadTasks() {
        taskList.innerHTML = '<p>লোড হচ্ছে...</p>';
        db.collection('tasks').where('active', '==', true).get().then(snapshot => {
            taskList.innerHTML = '';
            if (snapshot.empty) {
                taskList.innerHTML = '<p>কোনো টাস্ক নেই</p>';
                return;
            }
            snapshot.forEach(doc => {
                const task = doc.data();
                const div = document.createElement('div');
                div.className = 'task-item';
                div.innerHTML = `
                    <h4>${task.title}</h4>
                    <p>${task.description}</p>
                    <p><strong>পুরস্কার: ৳ ${task.reward}</strong></p>
                    <button class="task-btn" data-id="${doc.id}">কমপ্লিট করুন</button>
                `;
                taskList.appendChild(div);
            });
            document.querySelectorAll('.task-btn').forEach(btn => {
                btn.addEventListener('click', () => completeTask(btn.dataset.id));
            });
        });
    }

    function completeTask(taskId) {
        const btn = document.querySelector(`[data-id="${taskId}"]`);
        btn.disabled = true;
        btn.textContent = 'লোড হচ্ছে...';
        window.showGiga().then(() => {
            db.collection('tasks').doc(taskId).get().then(doc => {
                const task = doc.data();
                userRef.update({
                    balance: firebase.firestore.FieldValue.increment(task.reward),
                    [`tasksCompleted.${taskId}`]: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    tg.showAlert(`টাস্ক কমপ্লিট! ৳ ${task.reward} পেয়েছেন।`);
                    btn.textContent = 'কমপ্লিট';
                    btn.style.background = '#4caf50';
                });
            });
        }).catch(() => {
            btn.disabled = false;
            btn.textContent = 'কমপ্লিট করুন';
        });
    }

    // --- Load History ---
    function loadHistory() {
        historyList.innerHTML = '<p>লোড হচ্ছে...</p>';
        db.collection('withdrawals')
          .where('userId', '==', currentUser.id.toString())
          .orderBy('timestamp', 'desc')
          .get()
          .then(snapshot => {
              historyList.innerHTML = '';
              if (snapshot.empty) {
                  historyList.innerHTML = '<p>কোনো হিস্ট্রি নেই</p>';
                  return;
              }
              snapshot.forEach(doc => {
                  const w = doc.data();
                  const statusClass = w.status === 'approved' ? 'success' : w.status === 'pending' ? 'pending' : 'rejected';
                  const statusText = w.status === 'approved' ? 'সফল' : w.status === 'pending' ? 'পেন্ডিং' : 'রিজেক্ট';
                  const div = document.createElement('div');
                  div.className = `history-item ${statusClass}`;
                  div.innerHTML = `
                      <p><strong>৳ ${w.amount}</strong> → ${w.method} (${w.account})</p>
                      <p>${new Date(w.timestamp?.toDate()).toLocaleString('bn-BD')} | ${statusText}</p>
                  `;
                  historyList.appendChild(div);
              });
          });
    }

    // --- User Data ---
    function fetchUserData() {
        userRef.onSnapshot(doc => {
            const today = new Date().toISOString().slice(0, 10);
            if (doc.exists) {
                userData = doc.data();
                if (!userData.spinsToday || userData.spinsToday.date !== today) {
                    userData.spinsToday = { date: today, count: 0 };
                }
                if (!userData.referCount) userData.referCount = 0;
            } else {
                userData = {
                    fullName: `${currentUser.first_name} ${currentUser.last_name || ''}`.trim(),
                    username: currentUser.username || '',
                    balance: 0,
                    lastCheckin: null,
                    spinsToday: { date: today, count: 0 },
                    referCount: 0
                };
                userRef.set(userData);
            }
            updateUI();
        });
    }

    function updateUI() {
        const balance = userData.balance || 0;
        headerElements.balance.innerText = `৳ ${balance.toFixed(2)}`;
        headerElements.fullName.innerText = userData.fullName || currentUser.first_name;
        headerElements.username.innerText = userData.username ? `@${userData.username}` : `#${currentUser.id}`;
        headerElements.pic.innerText = getInitials(userData.fullName);
        walletElements.balance.innerText = `৳ ${balance.toFixed(2)}`;
        walletElements.submitBtn.disabled = balance < adminSettings.minWithdraw;
        referElements.link.value = `https://t.me/${BOT_USERNAME}?start=${currentUser.id}`;
        spinElements.spinsLeft.innerText = Math.max(0, adminSettings.spinConfig.dailyLimit - (userData.spinsToday?.count || 0));
    }

    // --- Events ---
    function setupEventListeners() {
        navButtons.forEach(btn => btn.addEventListener('click', () => showScreen(btn.dataset.screen)));
        document.getElementById('dailyCheckinBtn').addEventListener('click', handleDailyCheckin);
        document.getElementById('spinWheelBtn').addEventListener('click', () => showScreen('spin-screen'));
        spinElements.triggerBtn.addEventListener('click', handleSpin);
        walletElements.submitBtn.addEventListener('click', handleWithdraw);
        referElements.shareBtn.addEventListener('click', () => tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referElements.link.value)}`));
    }

    function showScreen(id) {
        screens.forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        navButtons.forEach(b => b.classList.toggle('active', b.dataset.screen === id));
        if (id === 'task-screen') loadTasks();
        if (id === 'history-screen') loadHistory();
    }

    function handleDailyCheckin() {
        const today = new Date().toISOString().slice(0, 10);
        if (userData.lastCheckin === today) return tg.showAlert("আজকের বোনাস নেওয়া হয়েছে");
        this.disabled = true;
        window.showGiga().then(() => {
            userRef.update({
                balance: firebase.firestore.FieldValue.increment(adminSettings.dailyReward),
                lastCheckin: today
            }).then(() => tg.showAlert(`৳ ${adminSettings.dailyReward} পেয়েছেন!`));
        }).finally(() => this.disabled = false);
    }

    function handleSpin() {
        if (isSpinning) return;
        const left = adminSettings.spinConfig.dailyLimit - (userData.spinsToday?.count || 0);
        if (left <= 0) return tg.showAlert("আজকের স্পিন শেষ");
        isSpinning = true;
        spinElements.triggerBtn.disabled = true;
        const total = currentRotation + (360 * 5) + Math.random() * 360;
        spinElements.wheelGroup.style.transform = `rotate(${total}deg)`;
        currentRotation = total;
        setTimeout(() => {
            window.showGiga().then(() => {
                userRef.update({
                    balance: firebase.firestore.FieldValue.increment(adminSettings.spinConfig.rewardAmount),
                    'spinsToday.count': firebase.firestore.FieldValue.increment(1)
                }).then(() => tg.showAlert(`৳ ${adminSettings.spinConfig.rewardAmount} পেয়েছেন!`));
            }).finally(() => {
                isSpinning = false;
                spinElements.triggerBtn.disabled = false;
                const final = total % 360;
                spinElements.wheelGroup.style.transition = 'none';
                spinElements.wheelGroup.style.transform = `rotate(${final}deg)`;
                setTimeout(() => spinElements.wheelGroup.style.transition = 'transform 5s cubic-bezier(0.23,1,0.32,1)', 50);
            });
        }, 5000);
    }

    function handleWithdraw() {
        const method = walletElements.methodSelect.value;
        const account = walletElements.accountInput.value.trim();
        if (!method || !account) return tg.showAlert("সব তথ্য দিন");
        if (userData.balance < adminSettings.minWithdraw) return tg.showAlert("ন্যূনতম উইথড্র প্রয়োজন");

        this.disabled = true;
        db.collection('withdrawals').add({
            userId: currentUser.id.toString(),
            amount: userData.balance,
            method: method,
            account: account,
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            userRef.update({ balance: 0 }).then(() => {
                tg.showAlert("উইথড্র অনুরোধ জমা হয়েছে");
                showScreen('home-screen');
            });
        }).finally(() => this.disabled = false);
    }

    // --- SVG Wheel ---
    function createSvgWheel() {
        const g = spinElements.wheelGroup;
        g.innerHTML = '';
        const colors = ['#e53935','#1e88e5','#43a047','#fdd835','#8e24aa','#d81b60','#00acc1','#fb8c00','#5e35b1','#6d4c41'];
        for (let i = 0; i < 10; i++) {
            const s = i * 36, e = s + 36;
            const sp = polar(250,250,210,e), ep = polar(250,250,210,s);
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", `M250,250 L${sp.x},${sp.y} A210,210 0 0,0 ${ep.x},${ep.y} Z`);
            path.setAttribute("fill", colors[i]);
            path.setAttribute("stroke", "#fff");
            path.setAttribute("stroke-width", "2");
            g.appendChild(path);
        }
    }
    function polar(cx, cy, r, deg) {
        const rad = (deg - 90) * Math.PI / 180;
        return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    }

    function getInitials(name) {
        const parts = name.split(' ');
        return (parts[0][0] || '') + (parts[1]?.[0] || '');
    }
});
