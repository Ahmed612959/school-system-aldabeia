document.addEventListener('DOMContentLoaded', function () {
    // دالة لجلب البيانات من الخادم بمسار نسبي (يعمل على Vercel)
    async function getFromServer(endpoint) {
        try {
            const cleanEndpoint = endpoint.replace(/^\/+/, '');
            const url = `/api/${cleanEndpoint}`; // <-- مسار نسبي (مهم لـ Vercel)
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`خطأ ${response.status}: ${errorText}`);
            }
            const data = await response.json();
            console.log(`تم جلب البيانات من: ${url}`, data.length, 'عنصر');
            return data || [];
        } catch (error) {
            console.error(`فشل جلب البيانات من ${endpoint}:`, error);
            alert('خطأ في الاتصال بالخادم! تأكد من الإنترنت أو حاول مرة أخرى.');
            return [];
        }
    }

    // التحقق من تسجيل الدخول في الصفحات المحمية
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    const protectedPages = ['Home.html', 'admin.html', 'profile.html'];

    if (protectedPages.includes(currentPage)) {
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser) {
            console.log('لا يوجد مستخدم مسجل الدخول، إعادة توجيه إلى login.html');
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
                        ? await getFromServer('/api/admins')
                        : await getFromServer('/api/students');
                    const user = users.find(u => u.username === loggedInUser.username);
                    if (user) {
                        welcomeMessage.textContent = `مرحبًا، ${user.fullName}`;
                    } else {
                        console.warn('المستخدم غير موجود في قاعدة البيانات:', loggedInUser);
                    }
                } catch (err) {
                    console.error('فشل تحميل اسم المستخدم:', err);
                }
            })();
        }
    }

    // التعامل مع نموذج تسجيل الدخول
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                alert('يرجى إدخال اسم المستخدم وكلمة المرور!');
                return;
            }

            // تحقق من تحميل CryptoJS
            if (typeof CryptoJS === 'undefined') {
                alert('مكتبة التشفير غير محملة! تأكد من الاتصال بالإنترنت.');
                console.error('CryptoJS not loaded');
                return;
            }

            let hashedPassword;
            try {
                hashedPassword = CryptoJS.SHA256(password).toString();
                console.log('تم تشفير كلمة المرور بنجاح');
            } catch (error) {
                console.error('خطأ في تشفير كلمة المرور:', error);
                alert('خطأ في تشفير كلمة المرور!');
                return;
            }

            try {
                console.log('جاري جلب بيانات الأدمن والطلاب...');
                const [admins, students] = await Promise.all([
                    getFromServer('/api/admins'),
                    getFromServer('/api/students')
                ]);

                console.log(`تم جلب ${admins.length} أدمن، ${students.length} طالب`);

                const admin = admins.find(a => a.username === username && a.password === hashedPassword);
                if (admin) {
                    console.log('تسجيل دخول أدمن ناجح:', admin.username);
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
                    console.log('تسجيل دخول طالب ناجح:', student.username);
                    localStorage.setItem('loggedInUser', JSON.stringify({
                        username: student.username,
                        type: 'student',
                        fullName: student.fullName
                    }));
                    window.location.href = 'Home.html';
                    return;
                }

                alert('اسم المستخدم أو كلمة المرور غير صحيحة! حاول مرة أخرى.');
            } catch (error) {
                console.error('فشل تسجيل الدخول:', error);
                alert('فشل الاتصال بالخادم أثناء تسجيل الدخول!');
            }
        });
    } else {
        console.log('نموذج تسجيل الدخول غير موجود في هذه الصفحة');
    }
});

// دالة تسجيل الخروج (متاحة عالميًا)
window.logout = function () {
    if (confirm('هل أنت متأكد أنك تريد تسجيل الخروج؟')) {
        localStorage.removeItem('loggedInUser');
        console.log('تم تسجيل الخروج بنجاح');
        window.location.href = 'login.html';
    }
};  
