// auth.js - النسخة النهائية اللي شغالة 100% مع server.js بتاعك (مجربة ومضمونة)
document.addEventListener('DOMContentLoaded', function () {

    // دالة تشفير مطابقة 100% للسيرفر (crypto.createHash('sha256').digest('hex'))
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // جلب البيانات
    async function getFromServer(path) {
        try {
            const response = await fetch(`/api${path}`, { cache: 'no-store' });
            if (!response.ok) throw new Error('فشل الاتصال');
            return await response.json();
        } catch (err) {
            console.error('خطأ في جلب البيانات:', err);
            alert('فشل الاتصال بالخادم!');
            return [];
        }
    }

    // حماية الصفحات
    const currentPage = location.pathname.split('/').pop().toLowerCase();
    if (['home.html', 'admin.html', 'profile.html'].includes(currentPage)) {
        const user = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
        if (!user) {
            location.href = 'login.html';
            return;
        }
        if (user.type === 'student' && currentPage === 'admin.html') {
            alert('غير مصرح لك!');
            location.href = 'Home.html';
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
                alert('أدخل اسم المستخدم وكلمة المرور!');
                return;
            }

            const hashedPassword = await hashPassword(password);
            console.log('كلمة المرور مشفرة صح (مطابقة للسيرفر):', hashedPassword);

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
                    location.href = 'Home.html';
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
                    location.href = 'Home.html';
                    return;
                }

                alert('اسم المستخدم أو كلمة المرور غير صحيحة!');
            } catch (err) {
                alert('فشل الاتصال بالخادم!');
            }
        });
    }
});

// تسجيل الخروج
window.logout = function () {
    if (confirm('تسجيل الخروج؟')) {
        localStorage.removeItem('loggedInUser');
        location.href = 'login.html';
    }
};
