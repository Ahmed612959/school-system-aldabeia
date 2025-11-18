// auth.js - مُحسّن 100% لـ Vercel
// https://schoolx-five.vercel.app
// تاريخ التحديث: 14 نوفمبر 2025

document.addEventListener('DOMContentLoaded', function () {

    // دالة جلب البيانات من الخادم بمسار نسبي (يعمل على Vercel)
    // استبدل دالة getFromServer كلها بالنسخة دي (النهائية والمضمونة):
async function getFromServer(endpoint) {
    try {
        // الحل الأمثل: نجرب أولاً بالمسار النسبي الصحيح
        let url = endpoint.startsWith('/') ? `/api${endpoint}` : `/api/${endpoint}`;

        let response = await fetch(url, { cache: 'no-store' });

        // لو الطلب فشل (يعني المسار غلط)، نجرب بالطريقة التانية
        if (!response.ok && response.status === 404) {
            url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            response = await fetch(url, { cache: 'no-store' });
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`خطأ ${response.status}: ${errorText || 'لا يوجد استجابة'}`);
        }

        const data = await response.json();
        console.log(`تم جلب البيانات من: ${url} →`, data.length || data);
        return data || [];
    } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        alert('فشل الاتصال بالخادم! تأكد من الإنترنت أو تواصل مع الإدارة.');
        return [];
    }
}

    // حماية الصفحات المحمية
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
            alert('غير مصرح لك بدخول لوحة تحكم الأدمن!');
            window.location.href = 'Home.html';
            return;
        }

        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            (async () => {
                try {
                    const users = loggedInUser.type === 'admin'
                        ? await getFromServer('/admins')
                        : await getFromServer('/students');
                    const user = users.find(u => u.username === loggedInUser.username);
                    welcomeMessage.textContent = `مرحبًا، ${user?.fullName || loggedInUser.username}`;
                } catch (err) {
                    console.error('فشل تحميل الاسم:', err);
                }
            })();
        }
    }

    // نموذج تسجيل الدخول
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

            if (typeof CryptoJS === 'undefined') {
                alert('مكتبة التشفير غير محملة!');
                return;
            }

            const hashedPassword = CryptoJS.SHA256(password).toString();
            console.log('كلمة المرور مشفرة:', hashedPassword);

            try {
                const [admins, students] = await Promise.all([
                    getFromServer('/admins'),
                    getFromServer('/students')
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
                console.error('خطأ في تسجيل الدخول:', error);
                alert('فشل الاتصال بالخادم أثناء تسجيل الدخول!');
            }
        });
    }

    // دالة تسجيل الخروج
    window.logout = function () {
        if (confirm('هل تريد تسجيل الخروج؟')) {
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        }
    };
});
