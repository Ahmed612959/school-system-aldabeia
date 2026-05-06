// auth.js - النسخة المحدثة لـ bcrypt
document.addEventListener('DOMContentLoaded', function () {

    // تسجيل الدخول باستخدام bcrypt (الطريقة الصحيحة)
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

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    localStorage.setItem('loggedInUser', JSON.stringify({
                        username: data.user.username,
                        fullName: data.user.fullName,
                        type: data.user.type,
                        ...(data.user.id && { id: data.user.id })
                    }));

                    alert(`✅ مرحباً ${data.user.fullName}!`);
                    location.href = 'Home.html';
                } else {
                    alert(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة!');
                }
            } catch (err) {
                console.error('Login Error:', err);
                alert('فشل الاتصال بالخادم! تأكد أن السيرفر شغال.');
            }
        });
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
});

// تسجيل الخروج
window.logout = function () {
    if (confirm('تسجيل الخروج؟')) {
        localStorage.removeItem('loggedInUser');
        location.href = 'login.html';
    }
};
