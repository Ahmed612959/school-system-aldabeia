// signup.js - محدث 100% لموقعك الرسمي
// https://school-system-nursing.netlify.app
// تاريخ التحديث: 9 نوفمبر 2025

// دالة عرض الرسائل المنبثقة (Toast)
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 9999;
        animation: slideIn 0.5s ease;
        background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(toast);

    // إضافة أنيميشن بسيط
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.5s ease reverse';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// إرسال البيانات للسيرفر
async function saveToServer(endpoint, data) {
    const API_BASE = 'https://school-system-nursing.netlify.app/api';
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `خطأ ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('خطأ في الاتصال بالسيرفر:', error);
        throw error;
    }
}

// التحقق من توفر اسم المستخدم
async function checkUsernameAvailability(username) {
    try {
        const response = await fetch('https://school-system-nursing.netlify.app/api/check-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await response.json();
        return data.available === true;
    } catch (error) {
        console.error('فشل التحقق من اسم المستخدم:', error);
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
    const confirmPassword = document.getElementById('confirmPassword')?.value || password;

    // التحقق من الحقول
    if (!fullName || !username || !studentCodeNumbers || !email || !phone || !birthdate || !address || !password) {
        showToast('يرجى ملء جميع الحقول المطلوبة!', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showToast('كلمتا المرور غير متطابقتين!', 'error');
        return;
    }

    if (!/^\d{3}$/.test(studentCodeNumbers)) {
        showToast('كود الطالب يجب أن يكون 3 أرقام فقط!', 'error');
        return;
    }

    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        showToast('اسم المستخدم: 3-20 حرف أو رقم فقط (بدون مسافات أو رموز)', 'error');
        return;
    }

    const studentCode = `STU${studentCodeNumbers}`;

    // التحقق من توفر اسم المستخدم
    const availabilitySpan = document.getElementById('username-availability');
    const isAvailable = await checkUsernameAvailability(username);

    if (!isAvailable) {
        availabilitySpan.textContent = 'هذا الاسم مستخدم بالفعل!';
        availabilitySpan.style.color = '#dc3545';
        availabilitySpan.style.display = 'block';
        showToast('اسم المستخدم غير متاح!', 'error');
        return;
    } else {
        availabilitySpan.textContent = 'اسم المستخدم متاح!';
        availabilitySpan.style.color = '#28a745';
        availabilitySpan.style.display = 'block';
    }

    try {
        const result = await saveToServer('/register-student', {
            fullName,
            username,
            id: studentCode,
            email,
            phone,
            birthdate,
            address,
            password
        });

        showToast(`تم إنشاء الحساب بنجاح!
اسم المستخدم: ${username}
كلمة المرور: ${password}
سيتم تحويلك لتسجيل الدخول...`, 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3500);

    } catch (error) {
        console.error('فشل إنشاء الحساب:', error);
        showToast(`فشل إنشاء الحساب: ${error.message}`, 'error');
    }
});

// التحقق الفوري من اسم المستخدم أثناء الكتابة
document.getElementById('username')?.addEventListener('input', async function(e) {
    const username = e.target.value.trim();
    const availabilitySpan = document.getElementById('username-availability');

    if (username.length === 0) {
        availabilitySpan.style.display = 'none';
        return;
    }

    if (username.length < 3) {
        availabilitySpan.textContent = 'يجب أن يكون 3 أحرف على الأقل';
        availabilitySpan.style.color = '#dc3545';
        availabilitySpan.style.display = 'block';
        return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
        availabilitySpan.textContent = 'أحرف وأرقام فقط!';
        availabilitySpan.style.color = '#dc3545';
        availabilitySpan.style.display = 'block';
        return;
    }

    availabilitySpan.textContent = 'جاري التحقق...';
    availabilitySpan.style.color = '#ffc107';
    availabilitySpan.style.display = 'block';

    const isAvailable = await checkUsernameAvailability(username);

    if (isAvailable) {
        availabilitySpan.textContent = 'متاح!';
        availabilitySpan.style.color = '#28a745';
    } else {
        availabilitySpan.textContent = 'غير متاح!';
        availabilitySpan.style.color = '#dc3545';
    }
});
