// auth.js - النسخة المتطابقة 100% مع signup.js الجديد اللي بعثته
document.addEventListener('DOMContentLoaded', function () {

    // جلب البيانات من المسارات الصحيحة (زي ما بيخزن signup.js)
    async function getFromServer(endpoint) {
        {
        try {
            const url = `/api${endpoint}`;
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error('فشل جلب البيانات');
            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('خطأ في جلب البيانات:', error);
            return [];
        }
    }

    // حماية الصفحات
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    if (['home.html', 'admin.html', 'profile.html'].includes(currentPage)) {
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!user) return window.location.href = 'login.html';
        if (user.type === 'student' && currentPage === 'admin.html') {
            alert('غير مصرح لك!');
            window.location.href = 'Home.html';
        }
    }

    // تسجيل الدخول - بدون تشفير (لأن signup.js بيخزنها نص صريح)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim(); // نص صريح

            if (!username || !password) return alert('أدخل البيانات كاملة!');

            try {
                // جلب الطلاب والأدمن من نفس المسارات اللي بيخزن فيها signup.js
                const [admins, students] = await Promise.all([
                    getFromServer('/admins'),
                    getFromServer('/students')
                ]);

                // البحث بدون تشفير
                const admin = admins.find(a => a.username === username && a.password === password);
                if (admin) {
                    localStorage.setItem('loggedInUser', JSON.stringify({
                        username: admin.username,
                        fullName: admin.fullName || admin.name,
                        type: 'admin'
                    }));
                    window.location.href = 'Home.html';
                    return;
                }

                const student = students.find(s => s.username === username && s.password === password);
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
            } catch (err) {
                alert('فشل الاتصال بالخادم');
            }
        });
    }

    // تسجيل الخروج
    window.logout = function () {
        if (confirm('تسجيل الخروج؟')) {
            localStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        }
    };
});
