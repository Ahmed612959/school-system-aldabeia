// auth.js
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من تسجيل الدخول في كل صفحة
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    const protectedPages = ['Home.html', 'admin.html', 'profile.html'];
    
    if (protectedPages.includes(currentPage)) {
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser) {
            console.log('No logged-in user, redirecting to login.html');
            window.location.href = 'index.html';
            return;
        }
        if (loggedInUser.type === 'student' && currentPage === 'admin.html') {
            alert('غير مصرح لك بدخول لوحة تحكم الأدمن!');
            window.location.href = 'Home.html';
            return;
        }
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            const user = loggedInUser.type === 'admin' 
                ? DataManager.getData(DataManager.STORAGE_KEYS.ADMINS).find(a => a.username === loggedInUser.username)
                : DataManager.getData(DataManager.STORAGE_KEYS.STUDENTS).find(s => s.username === loggedInUser.username);
            if (user) {
                welcomeMessage.textContent = `مرحبًا، ${user.fullName}`;
                console.log('Welcome message set for:', user.fullName);
            } else {
                console.error('User not found for welcome message:', loggedInUser);
            }
        }
    }

    // التعامل مع نموذج تسجيل الدخول
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            console.log('Login attempt:', { username });

            if (!username || !password) {
                alert('يرجى إدخال اسم المستخدم وكلمة المرور!');
                console.warn('Empty username or password');
                return false;
            }

            let hashedPassword;
            try {
                hashedPassword = CryptoJS.SHA256(password).toString();
                console.log('Hashed password for login:', hashedPassword.length, 'characters');
            } catch (error) {
                console.error('CryptoJS error:', error);
                alert('خطأ في تشفير كلمة المرور! تأكد من تحميل مكتبة CryptoJS.');
                return false;
            }

            // جلب البيانات من DataManager
            const admins = DataManager.getData(DataManager.STORAGE_KEYS.ADMINS);
            const students = DataManager.getData(DataManager.STORAGE_KEYS.STUDENTS);

            const admin = admins.find(a => a.username === username && a.password === hashedPassword);
            if (admin) {
                console.log('Admin login successful:', admin.username);
                localStorage.setItem('loggedInUser', JSON.stringify({ 
                    username: admin.username, 
                    type: 'admin',
                    fullName: admin.fullName 
                }));
                window.location.href = 'Home.html';
                return true;
            }

            const student = students.find(s => s.username === username && s.password === hashedPassword);
            if (student) {
                console.log('Student login successful:', student.username);
                localStorage.setItem('loggedInUser', JSON.stringify({ 
                    username: student.username,
                    type: 'student',
                    fullName: student.fullName 
                }));
                window.location.href = 'Home.html';
                return true;
            }

            console.warn('Login failed: Invalid username or password', { username, hashedPassword });
            alert('اسم المستخدم أو كلمة المرور غير صحيحة! تأكد من البيانات وأعد المحاولة.');
            return false;
        });
    } else {
        console.log('Login form not found on this page');
    }
});

// دالة تسجيل الخروج
window.logout = function() {
    if (confirm('هل أنت متأكد أنك تريد تسجيل الخروج؟')) {
        localStorage.removeItem('loggedInUser');
        console.log('User logged out, only loggedInUser removed');
        window.location.href = 'index.html';
        return true;
    }
    return false;
};