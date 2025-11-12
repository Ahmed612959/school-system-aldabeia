// دالة لعرض رسائل التنبيه
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.color = 'white';
    toast.style.backgroundColor = type === 'success' ? '#28a745' : '#dc3545';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toast.style.zIndex = '10000';
    toast.style.fontWeight = '500';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// إرسال طلب إلى الخادم
async function saveToServer(endpoint, data) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'حدث خطأ في الخادم');
        }
        return result;
    } catch (error) {
        throw error;
    }
}

// التحقق من توفر اسم المستخدم
async function checkUsernameAvailability(username) {
    try {
        const response = await fetch('/api/check-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await response.json();
        return data.available;
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
}

// معالجة نموذج إنشاء حساب الطالب
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const studentCodeNumbers = document.getElementById('studentCode').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const birthdate = document.getElementById('birthdate').value;
    const address = document.getElementById('address').value.trim();
    const password = document.getElementById('password').value;

    // إعادة تعيين رسائل الخطأ
    document.getElementById('username-availability').style.display = 'none';

    // التحقق من الحقول
    if (!fullName || !username || !studentCodeNumbers || !email || !phone || !birthdate || !address || !password) {
        showToast('يرجى ملء جميع الحقول!', 'error');
        return;
    }

    // التحقق من كود الطالب (3 أرقام)
    if (!/^\d{3}$/.test(studentCodeNumbers)) {
        showToast('كود الطالب يجب أن يكون 3 أرقام فقط!', 'error');
        return;
    }

    // التحقق من صيغة اسم المستخدم
    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        showToast('اسم المستخدم: 3-20 حرف (أحرف وأرقام فقط)!', 'error');
        return;
    }

    // التحقق من توفر اسم المستخدم
    const isUsernameAvailable = await checkUsernameAvailability(username);
    const availabilitySpan = document.getElementById('username-availability');
    if (!isUsernameAvailable) {
        availabilitySpan.textContent = 'اسم المستخدم غير متاح!';
        availabilitySpan.style.color = '#dc3545';
        availabilitySpan.style.display = 'block';
        return;
    } else {
        availabilitySpan.textContent = 'اسم المستخدم متاح!';
        availabilitySpan.style.color = '#28a745';
        availabilitySpan.style.display = 'block';
    }

    // دمج STU مع الأرقام
    const studentCode = `STU${studentCodeNumbers}`;

    try {
        const response = await saveToServer('/api/register-student', {
            fullName,
            username,
            id: studentCode,        // مهم جدًا: id = STU123
            email,
            phone,
            birthdate,
            address,
            password
        });

        showToast(`تم إنشاء الحساب بنجاح! اسم المستخدم: ${response.username}`, 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);

    } catch (error) {
        console.error('Error creating account:', error);
        // رسائل مخصصة من الـ Backend
        const msg = error.message;
        if (msg.includes('Student code')) showToast('كود الطالب مستخدم من قبل!', 'error');
        else if (msg.includes('Username')) showToast('اسم المستخدم مستخدم من قبل!', 'error');
        else if (msg.includes('Email')) showToast('البريد الإلكتروني مستخدم من قبل!', 'error');
        else showToast(`خطأ: ${msg}`, 'error');
    }
});

// التحقق من توفر اسم المستخدم أثناء الكتابة (مع تأخير)
let usernameTimeout;
document.getElementById('username')?.addEventListener('input', async (e) => {
    const username = e.target.value.trim();
    const availabilitySpan = document.getElementById('username-availability');

    clearTimeout(usernameTimeout);

    if (username.length < 3 || !/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        availabilitySpan.textContent = 'اسم المستخدم يجب أن يكون 3-20 حرف (أحرف وأرقام فقط)!';
        availabilitySpan.style.color = '#dc3545';
        availabilitySpan.style.display = 'block';
        return;
    }

    // تأخير 500ms عشان ما يرسل طلبات كتير
    usernameTimeout = setTimeout(async () => {
        const isAvailable = await checkUsernameAvailability(username);
        availabilitySpan.textContent = isAvailable ? 'اسم المستخدم متاح!' : 'اسم المستخدم غير متاح!';
        availabilitySpan.style.color = isAvailable ? '#28a745' : '#dc3545';
        availabilitySpan.style.display = 'block';
    }, 500);
});
