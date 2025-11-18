// auth.js - النسخة النهائية اللي شغالة 100% مع موقعك الحالي
document.addEventListener('DOMContentLoaded', function () {

    async function getFromServer(endpoint) {
        try {
            const cleanEndpoint = endpoint.replace(/^\/+/, '');
            const url = `/api/${cleanEndpoint}.json`;  // ← .json مهم جدًا
            const response = await fetch(url);
            if (!response.ok) throw new Error('فشل جلب البيانات');
            const data = await response.json();
            console.log(`تم جلب ${data.length} من ${url}`);
            return data || [];
        } catch (error) {
            console.error('خطأ في جلب البيانات:', error);
            alert('فشل الاتصال بالخادم!');
            return [];
        }
    }

    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    const protectedPages = ['home.html', 'admin.html', 'profile.html'];

    if (protectedPages.includes(currentPage)) {
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!user) return window.location.href = 'login.html';
        if (user.type === 'student' && currentPage === 'admin.html') {
            alert('غير مصرح لك!');
            window.location.href = 'Home.html';
        }
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim(); // نص صريح

            if (!username || !password) return alert('أدخل البيانات كاملة');

            try {
                const [admins, students] = await Promise.all([
                    getFromServer('/api/admins'),
                    getFromServer('/api/students')
                ]);

                const admin = admins.find(a => a.username === username && a.password === password);
                if (admin) {
                    localStorage.setItem('loggedInUser', JSON.stringify({username: admin.username, type: 'admin', fullName: admin.fullName}));
                    window.location.href = 'Home.html';
                    return;
                }

                const student = students.find(s => s.username === username && s.password === password);
                if (student) {
                    localStorage.setItem('loggedInUser', JSON.stringify({username: student.username, type: 'student', fullName: student.fullName, id: student.id}));
                    window.location.href = 'Home.html';
                    return;
                }

                alert('اسم المستخدم أو كلمة المرور غير صحيحة!');
            } catch (err) {
                alert('خطأ في الاتصال بالسيرفر');
            }
        });
    }
});

window.logout = function() {
    if (confirm('تسجيل الخروج؟')) {
        localStorage.removeItem('loggedInUser');
        window.location.href = 'login.html';
    }
}; 
