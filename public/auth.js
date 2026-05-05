// auth.js - محدث ومتوافق مع server.js الجديد

document.addEventListener('DOMContentLoaded', function () {

    // دالة تشفير SHA-256 (مطابقة للسيرفر)
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // دالة جلب البيانات مع تحسين الـ Error Handling
    async function getFromServer(path) {
        try {
            console.log(`جاري طلب: /api${path}`);
            
            const response = await fetch(`/api${path}`, { 
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                console.error(`خطأ ${response.status} في ${path}:`, errorText);
                
                throw new Error(`HTTP ${response.status}: ${errorText || 'فشل الاتصال بالسيرفر'}`);
            }

            const data = await response.json();
            console.log(`تم جلب البيانات من ${path} بنجاح`);
            return data;

        } catch (err) {
            console.error(`فشل في جلب ${path}:`, err.message);
            
            // رسالة واضحة للمستخدم
            if (err.message.includes('500')) {
                alert('خطأ في السيرفر (500)\nجاري تصحيح المشكلة...\n\nيرجى التحقق من Vercel Logs');
            } else if (err.message.includes('404')) {
                alert('الصفحة غير موجودة (404)');
            } else {
                alert('فشل الاتصال بالخادم\nيرجى المحاولة مرة أخرى');
            }
            
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
            alert('غير مصرح لك بالدخول إلى صفحة الأدمن!');
            location.href = 'home.html';
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
                alert('من فضلك أدخل اسم المستخدم وكلمة المرور');
                return;
            }

            try {
                const hashedPassword = await hashPassword(password);
                console.log('كلمة المرور المشفرة:', hashedPassword);

                // جلب البيانات من السيرفر
                const [admins, students] = await Promise.all([
                    getFromServer('/admins'),
                    getFromServer('/students')
                ]);

                // البحث عن الأدمن
                const admin = admins.find(a => a.username === username && a.password === hashedPassword);
                if (admin) {
                    localStorage.setItem('loggedInUser', JSON.stringify({
                        username: admin.username,
                        fullName: admin.fullName,
                        type: 'admin'
                    }));
                    location.href = 'home.html';
                    return;
                }

                // البحث عن الطالب
                const student = students.find(s => s.username === username && s.password === hashedPassword);
                if (student) {
                    localStorage.setItem('loggedInUser', JSON.stringify({
                        username: student.username,
                        fullName: student.fullName,
                        type: 'student',
                        id: student.id || student.studentCode
                    }));
                    location.href = 'home.html';
                    return;
                }

                alert('اسم المستخدم أو كلمة المرور غير صحيحة!');

            } catch (err) {
                console.error('خطأ أثناء تسجيل الدخول:', err);
                alert('حدث خطأ أثناء محاولة تسجيل الدخول\nيرجى المحاولة مرة أخرى');
            }
        });
    }
});

// دالة تسجيل الخروج
window.logout = function () {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        localStorage.removeItem('loggedInUser');
        location.href = 'login.html';
    }
};