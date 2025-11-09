// auth.js - محدث 100% لموقعك الرسمي
// https://school-system-nursing.netlify.app
// تاريخ التحديث: 9 نوفمبر 2025 - 05:20 صباحًا

document.addEventListener('DOMContentLoaded', function () {

    // الرابط الجديد للـ API (Netlify Functions)
    const API_BASE = 'https://school-system-nursing.netlify.app/api';

    // دالة جلب البيانات من الخادم
    async function getFromServer(endpoint) {
        try {
            const url = `${API_BASE}${endpoint}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`خطأ ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`تم جلب ${data.length} عنصر من: ${endpoint}`);
            return data || [];
        } catch (error) {
            console.error('خطأ في جلب البيانات:', error);
            alert('فشل الاتصال بالخادم! تأكد من الإنترنت وحاول مرة أخرى.');
            return [];
        }
    }

    // حماية الصفحات المحمية
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    const protectedPages = ['home.html', 'admin.html', 'profile.html', 'student.html', 'exam.html'];

    if (protectedPages.includes(currentPage)) {
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

        if (!loggedInUser) {
            alert('يجب تسجيل الدخول أولاً!');
            window.location.href = 'index.html';
            return;
        }

        // منع الطالب من دخول لوحة الأدمن
        if (loggedInUser.type === 'student' && currentPage === 'admin.html') {
            alert('غير مصرح لك بدخول لوحة تحكم الأدمن!');
            window.location.href = 'home.html';
            return;
        }

        // عرض اسم المستخدم في الترحيب
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.textContent = `مرحبًا، ${loggedInUser.fullName || loggedInUser.username}`;
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

            // تشفير كلمة المرور بنفس طريقة السيرفر
            const hashedPassword = CryptoJS.SHA256(password).toString();

            try {
                // جلب الأدمن والطلاب معًا
                const [admins, students] = await Promise.all([
                    getFromServer('/admins'),
                    getFromServer('/students')
                ]);

                // تسجيل دخول أدمن
                const admin = admins.find(a => a.username === username && a.password === hashedPassword);
                if (admin) {
                    localStorage.setItem('loggedInUser', JSON.stringify({
                        username: admin.username,
                        fullName: admin.fullName,
                        type: 'admin'
                    }));
                    alert('تم تسجيل الدخول بنجاح كـ أدمن!');
                    window.location.href = 'admin.html';
                    return;
                }

                // تسجيل دخول طالب
                const student = students.find(s => s.username === username && s.password === hashedPassword);
                if (student) {
                    localStorage.setItem('loggedInUser', JSON.stringify({
                        username: student.username,
                        fullName: student.fullName,
                        type: 'student',
                        id: student.id
                    }));
                    alert('تم تسجيل الدخول بنجاح كـ طالب!');
                    window.location.href = 'home.html';
                    return;
                }

                alert('اسم المستخدم أو كلمة المرور غير صحيحة!');
            } catch (error) {
                console.error('خطأ في تسجيل الدخول:', error);
                alert('حدث خطأ أثناء تسجيل الدخول. حاول لاحقًا.');
            }
        });
    }

    // نموذج إنشاء حساب جديد (register.html)
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const fullName = document.getElementById('fullName').value.trim();
            const username = document.getElementById('username').value.trim();
            const id = document.getElementById('id').value.trim().toUpperCase();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const birthdate = document.getElementById('birthdate').value;
            const address = document.getElementById('address').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // التحقق من الحقول
            if (!fullName || !username || !id || !email || !password) {
                alert('يرجى ملء جميع الحقول المطلوبة!');
                return;
            }
            if (password !== confirmPassword) {
                alert('كلمتا المرور غير متطابقتين!');
                return;
            }
            if (!/^STU\d{3}$/.test(id)) {
                alert('كود الطالب يجب أن يكون مثل: STU123');
                return;
            }
            if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
                alert('اسم المستخدم يجب أن يكون 3-20 حرف/رقم فقط (بدون مسافات)');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/register-student`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullName, username, id, email, phone, birthdate, address, password
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    alert(`تم إنشاء الحساب بنجاح!\n\nاسم المستخدم: ${username}\nكلمة المرور: ${password}\n\nسجل دخول الآن!`);
                    window.location.href = 'index.html';
                } else {
                    alert(result.error || 'فشل في إنشاء الحساب!');
                }
            } catch (error) {
                console.error('خطأ في إنشاء الحساب:', error);
                alert('فشل الاتصال بالخادم. تأكد من الإنترنت وحاول مرة أخرى.');
            }
        });
    }

    // دالة تسجيل الخروج
    window.logout = function () {
        if (confirm('هل تريد تسجيل الخروج؟')) {
            localStorage.removeItem('loggedInUser');
            alert('تم تسجيل الخروج بنجاح');
            window.location.href = 'index.html';
        }
    };

    // عرض بيانات المستخدم في profile.html
    const userInfoDiv = document.getElementById('user-info');
    if (userInfoDiv) {
        const user = JSON.parse(localStorage.getItem('loggedInUser'));
        if (user) {
            userInfoDiv.innerHTML = `
                <p><strong>الاسم الكامل:</strong> ${user.fullName}</p>
                <p><strong>اسم المستخدم:</strong> ${user.username}</p>
                <p><strong>النوع:</strong> ${user.type === 'admin' ? 'أدمن' : 'طالب'}</p>
                <p><strong>كود الطالب:</strong> ${user.id || 'غير متوفر'}</p>
            `;
        }
    }
});
