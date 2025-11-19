// auth.js - النسخة النهائية 100% متطابقة مع signup.js اللي بعثته
document.addEventListener('DOMContentLoaded', function () {

    // دالة جلب البيانات (نفس طريقة signup.js بالظبط)
    async function getFromServer(endpoint) {
        try {
            const cleanEndpoint = endpoint.replace(/^\/+/, '');
            const url = `/api/${cleanEndpoint}.json`;  // ← .json مهم جدًا زي signup.js
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error(`خطأ ${response.status}`);
            const data = await response.json();
            console.log(`تم جلب ${data.length} عنصر من ${url}`);
            return data || [];
        } catch (error) {
            console.error('فشل جلب البيانات:', error);
            alert('فشل الاتصال بالخادم! تأكد من الإنترنت.');
            return [];
        }
    }

    // حماية الصفحات
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    const protectedPages = ['home.html', 'admin.html', 'profile.html'];

    if (protectedPages.includes(currentPage)) {
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser) {
            alert('يجب تسجيل الدخول أولاً!');
            window.location.href = 'login.html';
            return;
        }
        if (loggedInUser.type === 'student' && currentPage === 'admin.html') {
            alert('غير مصرح لك!');
            window.location.href = 'Home.html';
            return;
        }

        // عرض الاسم الكامل
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            (async () => {
                try {
                    const users = loggedInUser.type === 'admin'
                        ? await getFromServer('/api/admins')
                        : await getFromServer('/api/students');
                    const user = users.find(u => u.username === loggedInUser.username);
                    welcomeMessage.textContent = `مرحبًا، ${user?.fullName || loggedInUser.username}`;
                } catch (err) {
                    console.error('فشل تحميل الاسم');
                }
            })();
        }
    }

    // تسجيل الدخول
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!username || !password) {
                alert('يرجى إدخال اسم المستخدم وكلمة المرور!');
                return;
            }

            // نفس التشفير بالظبط زي signup.js
            if (typeof CryptoJS === 'undefined') {
                alert('مكتبة التشفير غير محملة!');
                return;
            }

            const hashedPassword = CryptoJS.SHA256(password).toString();
            console.log('كلمة المرور المشفرة:', hashedPassword);

            try {
                const [admins, students] = await Promise.all([
                    getFromServer('/api/admins'),
                    getFromServer('/api/students')
                ]);

                const admin = admins.find(a => a.username === username && a.password === hashedPassword);
                if (admin) {
                    localStorage.setItem('loggedInUser', JSON.stringify({
                        username: admin.username,
                        fullName: admin.fullName,
                        type: 'admin'
                    }));
                    window.location.href = 'Home.html';
                    return;
                }

                const student = students.find(s => s.username === username && s.password === hashedPassword);
                if (student) {
                    localStorage.setItem('loggedInUser', JSON.stringify({
                        username: student.username,
                        fullName: student.fullName,
                        type: 'student',
                        id: student.id
                    }));
                    window.location.href = 'Home.html';
                    return;
                }

                alert('اسم المستخدم أو كلمة المرور غير صحيحة!');
            } catch (error) {
                console.error('فشل تسجيل الدخول:', error);
                alert('فشل الاتصال بالخادم!');
            }
        });
    }

    // تسجيل الخروج
    window.logout = function () {
        if (confirm('هل تريد تسجيل الخروج؟')) {
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        }
    };
});
