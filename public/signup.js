// ================= Toast =================
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; padding: 14px 22px;
        border-radius: 8px; color: white; font-weight: bold; z-index: 9999;
        background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        box-shadow: 0 4px 15px rgba(0,0,0,0.25); direction: rtl; text-align: right;
        max-width: 90%;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
}

// ================= Check Username Availability =================
async function checkUsernameAvailability(username) {
    try {
        const res = await fetch('https://schoolx-five.vercel.app/api/check-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        return data.available || false;
    } catch (err) {
        console.error(err);
        return false;
    }
}

// ================= Live Username Check =================
let usernameTimeout;
document.getElementById('username')?.addEventListener('input', (e) => {
    const username = e.target.value.trim();
    const span = document.getElementById('username-availability');

    clearTimeout(usernameTimeout);

    if (username.length < 3) {
        span.style.display = 'none';
        return;
    }

    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        span.textContent = '❌ 3-20 حرف أو رقم إنجليزي فقط';
        span.style.color = '#e74c3c';
        span.style.display = 'block';
        return;
    }

    span.textContent = '⏳ جاري التحقق...';
    span.style.color = '#f39c12';
    span.style.display = 'block';

    usernameTimeout = setTimeout(async () => {
        const isAvailable = await checkUsernameAvailability(username);
        span.textContent = isAvailable ? '✔ اسم المستخدم متاح' : '❌ اسم المستخدم مستخدم';
        span.style.color = isAvailable ? '#2ecc71' : '#e74c3c';
    }, 600);
});

// ================= Submit Form - النسخة المنفصلة النهائية =================
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName   = document.getElementById('fullName').value.trim();
    const usernameInput = document.getElementById('username').value.trim();
    const password   = document.getElementById('password').value.trim();
    let studentCode  = document.getElementById('studentId').value.trim();
    let phone        = document.getElementById('phone').value.trim();
    const parentName = document.getElementById('parentName').value.trim();
    let parentId     = document.getElementById('parentId').value.trim();

    const username = usernameInput.toLowerCase();
    studentCode = studentCode.replace(/\D/g, '');
    parentId = parentId.replace(/\D/g, '');

    // Client Validation
    if (!fullName || !username || !password || !studentCode || !phone || !parentName || !parentId) {
        return showToast('يرجى ملء جميع الحقول');
    }
    if (studentCode.length !== 7) return showToast('رقم الجلوس لازم 7 أرقام');
    if (parentId.length !== 14) return showToast('رقم ولي الأمر لازم 14 رقم');
    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) return showToast('اسم المستخدم غير صالح');
    if (password.length < 6) return showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل');

    const available = await checkUsernameAvailability(username);
    if (!available) return showToast('اسم المستخدم مستخدم بالفعل، اختر اسم آخر');

    // إرسال الطلب
    try {
        showToast('جاري إنشاء الحساب...', 'success');

        const payload = { fullName, username, password, studentCode, phone, parentName, parentId };

        const res = await fetch('https://schoolx-five.vercel.app/api/register-student', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } 
        catch { data = { error: text }; }

        if (!res.ok) throw new Error(data.error || 'فشل في إنشاء الحساب');

        showToast('تم إنشاء الحساب بنجاح 🎉', 'success');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1800);

    } catch (err) {
        console.error(err);
        showToast(err.message || 'حدث خطأ أثناء التسجيل');
    }
});
