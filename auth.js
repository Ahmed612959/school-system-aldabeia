// auth.js
document.addEventListener('DOMContentLoaded', function() {
    // دالة لتحديد الـ Base URL ديناميكيًا
    const getBaseUrl = () => {
        const { protocol, host } = window.location;
        return `${protocol}//${host}`;
    };

    // دالة لجلب البيانات من الخادم
    async function getFromServer(endpoint) {
        try {
            const cleanEndpoint = endpoint.replace(/^\/+/, '');
            const url = `${getBaseUrl()}${cleanEndpoint.startsWith('/') ? '' : '/'}${cleanEndpoint}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`خطأ ${response.status}`);
            const data = await response.json();
            console.log(`Data loaded from: ${url}`, data.length, 'items');
            return data || [];
        } catch (error) {
            console.error(`Error fetching from ${endpoint}:`, error);
            alert('خطأ في الاتصال بالخادم! تأكد من الإنترنت.');
            return [];
        }
    }

    // التحقق من تسجيل الدخول في الصفحات المحمية
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    const protectedPages = ['home.html', 'admin.html', 'profile.html'];
    
    if (protectedPages.includes(currentPage)) {
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser) {
            console.log('No logged-in user, redirecting to login.html');
            window.location.href = 'login.html'; // توجيه لـ login.html
            return;
        }

        if (loggedInUser.type === 'student' && currentPage === 'admin.html') {
            alert('غير مصرح لك بدخول لوحة تحكم الأدمن!');
            window.location.href = 'Home.html';
            return;
        }

        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            (async () => {
                const users = loggedInUser.type === 'admin' 
                    ? await getFromServer('/api/admins')
                    : await getFromServer('/api/students');
                const user = users.find(u => u.username === loggedInUser.username);
                if (user) {
                    welcomeMessage.textContent = `مرحبًا، ${user.fullName}`;
                } else {
                    console.error('User not found:', loggedInUser);
                }
            })();
        }
    }

    // التعامل مع نموذج تسجيل الدخول
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!username || !password) {
                alert('يرجى إدخال اسم المستخدم وكلمة المرور!');
                return;
            }

            let hashedPassword;
            try {
                hashedPassword = CryptoJS.SHA256(password).toString();
            } catch (error) {
                console.error('CryptoJS error:', error);
                alert('خطأ في تشفير كلمة المرور!');
                return;
            }

            const [admins, students] = await Promise.all([
                getFromServer('/api/admins'),
                getFromServer('/api/students')
            ]);

            const admin = admins.find(a => a.username === username && a.password === hashedPassword);
            if (admin) {
                localStorage.setItem('loggedInUser', JSON.stringify({ 
                    username: admin.username, 
                    type: 'admin',
                    fullName: admin.fullName 
                }));
                window.location.href = 'Home.html';
                return;
            }

            const student = students.find(s => s.username === username && s.password === hashedPassword);
            if (student) {
                localStorage.setItem('loggedInUser', JSON.stringify({ 
                    username: student.username, 
                    type: 'student',
                    fullName: student.fullName 
                }));
                window.location.href = 'Home.html';
                return;
            }

            alert('اسم المستخدم أو كلمة المرور غير صحيحة!');
        });
    }
});

// دالة تسجيل الخروج
window.logout = function() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('loggedInUser');
        window.location.href = 'login.html';
    }
};
