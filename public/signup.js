// signup.js - يشتغل 100% مع الباك إند الحالي
document.addEventListener('DOMContentLoaded', function () {

    // دالة تشفير مطابقة تمامًا لـ Node.js sha256 hex
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // التحقق من توفر اسم المستخدم
    const usernameInput = document.getElementById('username');
    const availabilitySpan = document.getElementById('username-availability');

    usernameInput?.addEventListener('input', async function () {
        const username = this.value.trim();
        if (username.length < 3) {
            availabilitySpan.style.display = 'none';
            return;
        }

        try {
            const students = await fetch('/api/students').then(r => r.ok ? r.json() : []);
            const admins = await fetch('/api/admins').then(r => r.ok ? r.json() : []);

            const exists = [...students, ...admins].some(u => u.username === username);
            if (exists) {
                availabilitySpan.textContent = '⚠️ اسم المستخدم موجود بالفعل';
                availabilitySpan.style.color = '#dc3545';
                availabilitySpan.style.display = 'block';
            } else {
                availabilitySpan.textContent = '✅ اسم المستخدم متاح';
                availabilitySpan.style.color = '#28a745';
                availabilitySpan.style.display = 'block';
            }
        } catch (err) {
            console.error('فشل التحقق من اسم المستخدم');
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

        // تحقق من القوة
        if (password.length < 6) {
            alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل!');
            return;
        }

        if (username.length < 3 || !/^[a-zA-Z0-9]+$/.test(username)) {
            alert('اسم المستخدم يجب أن يكون 3-20 حرف (أحرف وأرقام فقط)');
            return;
        }

        // توليد كود الطالب النهائي
        const studentId = `STU${studentCode}`;

        // تشفير كلمة المرور بنفس طريقة الباك إند
        const hashedPassword = await hashPassword(password);
        console.log('كلمة المرور بعد التشفير (ستُخزن):', hashedPassword);

        const newStudent = {
            id: studentId,
            fullName,
            username,
            password: hashedPassword,
            email,
            phone,
            birthdate,
            address,
            type: 'student',
            subjects: [],
            profile: { email, phone, birthdate, address, bio: '' }
        };

        try {
            const response = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStudent)
            });

            if (response.ok) {
                alert('تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن');
                window.location.href = 'login.html';
            } else {
                const error = await response.json();
                alert(error.error || 'فشل إنشاء الحساب! ربما اسم المستخدم موجود');
            }
        } catch (err) {
            console.error('خطأ في الاتصال:', err);
            alert('فشل الاتصال بالسيرفر! تأكد من الإنترنت');
        }
    });
});
