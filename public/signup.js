// signup.js - النسخة الصحيحة 100% اللي هتشتغل مع auth.js الحالي
document.addEventListener('DOMContentLoaded', function () {

    // استخدم نفس التشفير الموجود في auth.js (CryptoJS)
    function hashPassword(password) {
        if (typeof CryptoJS === 'undefined') {
            alert('مكتبة التشفير غير محملة!');
            throw new Error('CryptoJS not loaded');
        }
        return CryptoJS.SHA256(password).toString();
    }

    // فحص توفر اسم المستخدم (مع .json لأن الباك إند كده)
    const usernameInput = document.getElementById('username');
    const availabilitySpan = document.getElementById('username-availability');

    usernameInput?.addEventListener('input', async function () {
        const username = this.value.trim();
        if (username.length < 3) {
            availabilitySpan.style.display = 'none';
            return;
        }

        try {
            const [students, admins] = await Promise.all([
                fetch('/api/students.json').then(r => r.ok ? r.json() : []),
                fetch('/api/admins.json').then(r => r.ok ? r.json() : [])
            ]);

            const exists = [...students, ...admins].some(u => u.username === username);
            availabilitySpan.textContent = exists ? 'اسم المستخدم موجود بالفعل' : 'اسم المستخدم متاح';
            availabilitySpan.style.color = exists ? '#dc3545' : '#28a745';
            availabilitySpan.style.display = 'block';
        } catch (err) {
            console.error('فشل فحص اسم المستخدم');
        }
    });

    // نموذج إنشاء الحساب
    document.getElementById('student-signup-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value.trim();
        const username = document.getElementById('username').value.trim();
        const studentCode = document.getElementById('studentCode').value.padStart(3, '0');
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const birthdate = document.getElementById('birthdate').value;
        const address = document.getElementById('address').value.trim();
        const password = document.getElementById('password').value;

        if (password.length < 6) {
            alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل!');
            return;
        }

        if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
            alert('اسم المستخدم: أحرف وأرقام فقط، من 3-20 حرف');
            return;
        }

        const studentId = `STU${studentCode}`;

        // تشفير بنفس طريقة auth.js
        const hashedPassword = hashPassword(password);
        console.log('كلمة المرور المشفرة (سيتم تخزينها):', hashedPassword);

        const newStudent = {
            id: studentId,
            fullName,
            username,
            password: hashedPassword,  // نفس الـ hash اللي في auth.js
            email,
            phone,
            birthdate,
            address,
            type: 'student',
            subjects: [],
            profile: { email, phone, birthdate, address, bio: '' }
        };

        try {
            // إرسال للـ API (الباك إند بتاعك بيقبل POST على /api/students)
            const response = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStudent)
            });

            if (response.ok) {
                alert('تم إنشاء الحساب بنجاح! جاري توجيهك لتسجيل الدخول...');
                setTimeout(() => window.location.href = 'login.html', 1000);
            } else {
                const err = await response.json().catch(() => ({}));
                alert(err.error || 'فشل إنشاء الحساب');
            }
        } catch (err) {
            console.error('خطأ في الإرسال:', err);
            alert('فشل الاتصال بالسيرفر');
        }
    });
});
