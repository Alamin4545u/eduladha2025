const SUPABASE_URL = 'https://wcmgdhyizhykqblndnhx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbWdkaHlpemh5a3FibG5kbmh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMzM0MjAsImV4cCI6MjA3ODgwOTQyMH0.XuBmH3m0IMgdKen-By42CYlMMC9hhiijr_kDRqWJrp4';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const tg = window.Telegram.WebApp;

tg.ready();

const nameElement = document.getElementById('name');
const usernameElement = document.getElementById('username');
const statusElement = document.getElementById('status');

const user = tg.initDataUnsafe?.user;

if (user) {
    nameElement.innerText = `${user.first_name} ${user.last_name || ''}`;
    usernameElement.innerText = user.username || 'Not available';
    saveUserData(user);
} else {
    nameElement.innerText = 'Not found';
    usernameElement.innerText = 'Not found';
    statusElement.innerText = "Could not retrieve user data.";
}

async function saveUserData(userData) {
    try {
        const { error } = await supabase
            .from('users')
            .upsert({
                telegram_id: userData.id,
                first_name: userData.first_name,
                last_name: userData.last_name,
                username: userData.username
            }, {
                onConflict: 'telegram_id'
            });

        if (error) {
            // আসল error মেসেজটি স্ক্রিনে দেখানোর জন্য কোড
            statusElement.innerText = `Error: ${error.message}`;
            statusElement.style.color = 'red';
            console.error('Error saving user data:', error);
        } else {
            statusElement.innerText = 'Data saved successfully!';
            statusElement.style.color = 'green';
        }
    } catch (err) {
        statusElement.innerText = `Unexpected Error: ${err.message}`;
        statusElement.style.color = 'red';
        console.error('An unexpected error occurred:', err);
    }
}
