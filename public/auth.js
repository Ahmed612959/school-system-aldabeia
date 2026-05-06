// auth.js - النسخة النهائية المحدثة لـ bcrypt + معالجة أخطاء أفضل
document.addEventListener('DOMContentLoaded', function () {

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

            try {
                console.log('جاري تسجيل الدخول لـ:', username);

                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ username, password })
                });

                // معالجة الرد بشكل آمن (لحل مشكلة body stream already read)
                let data;
                try {
                    const text = await response.text();
                    console.log('Raw Response from server:', text);
                    
                    data = text ? JSON.parse(text) : {};
                } catch (parseError) {
                    console.error('Failed to parse JSON:', parseError);
                    throw new Error('الرد من السيرفر غير صالح (ليس JSON)');
                }

                if (response.ok && data.success) {
                    localStorage.setItem('loggedInUser', JSON.stringify({
                        username: data.user.username,
                        fullName: data.user.fullName,
                        type: data.user.type,
                        ...(data.user.id && { id: data.user.id })
                    }));

                    console.log('✅ تم تسجيل الدخول بنجاح:', data.user);
                    alert(`🎉 مرحباً ${data.user.fullName}!`);
                    location.href = 'Home.html';
                } else {
                    console.log('❌ فشل تسجيل الدخول:', data);
                    alert(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة!');
                }

            } catch (err) {
                console.error('Login Error:', err);
                alert('فشل الاتصال بالخادم! تأكد أن السيرفر يعمل وأن route /api/login موجود.');
            }
        });
    }

    // حماية الصفحات
    const currentPage = location.pathname.split('/').pop().toLowerCase();
    if (['home.html', 'admin.html', 'profile.html', 'index.html'].includes(currentPage)) {
        const user = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
        
        if (!user) {
            console.warn('مستخدم غير مسجل - إعادة توجيه');
            location.href = 'login.html';
            return;
        }

        if (user.type === 'student' && currentPage === 'admin.html') {
            alert('غير مصرح لك بالدخول إلى لوحة الإدارة!');
            location.href = 'Home.html';
        }
    }
});

// دالة تسجيل الخروج
window.logout = function () {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        localStorage.removeItem('loggedInUser');
        location.href = 'login.html';
    }
};
