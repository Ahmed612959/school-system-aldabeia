// ================= Toast =================
function showToast(message, type = 'error') {
    const toast = document.createElement('div');

    toast.textContent = message;

    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 9999;
        background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}


// ================= Check Username =================
async function checkUsernameAvailability(username) {
    try {
        const res = await fetch('/api/check-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }) // ✅ الصح
        });

        const data = await res.json();
        return data.available;

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

    // صيغة غير صحيحة
    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        span.textContent = '❌ 3-20 حروف أو أرقام فقط';
        span.style.color = '#e74c3c';
        span.style.display = 'block';
        return;
    }

    span.textContent = '⏳ جاري التحقق...';
    span.style.color = '#f39c12';
    span.style.display = 'block';

    usernameTimeout = setTimeout(async () => {
        const isAvailable = await checkUsernameAvailability(username);

        if (isAvailable) {
            span.textContent = '✔ اسم المستخدم متاح';
            span.style.color = '#2ecc71';
        } else {
            span.textContent = '❌ اسم المستخدم مستخدم';
            span.style.color = '#e74c3c';
        }
    }, 500);
});


// ================= Submit Form =================
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const studentCode = document.getElementById('studentId').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const parentName = document.getElementById('parentName').value.trim();
    const parentId = document.getElementById('parentId').value.trim();

    // ================= Validation =================
    if (!fullName || !username || !password || !studentCode || !phone || !parentName || !parentId) {
        return showToast('يرجى ملء جميع الحقول');
    }

    if (!/^\d{7}$/.test(studentCode)) {
        return showToast('رقم الجلوس لازم يكون 7 أرقام');
    }

    if (!/^\d{14}$/.test(parentId)) {
        return showToast('رقم بطاقة ولي الأمر لازم يكون 14 رقم');
    }

    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        return showToast('اسم المستخدم غير صالح');
    }

    if (password.length < 6) {
        return showToast('كلمة المرور لازم 6 حروف على الأقل');
    }

    // ================= Check Username Final =================
    const available = await checkUsernameAvailability(username);
    if (!available) {
        return showToast('اسم المستخدم مستخدم بالفعل');
    }

    // ================= Send Data =================
    try {
        showToast('جاري إنشاء الحساب...', 'success');

        const res = await fetch('/api/register-student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName,
                username,
                password,
                studentCode,
                phone,
                parentName,
                parentId
            })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        showToast('تم إنشاء الحساب بنجاح 🎉', 'success');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);

    } catch (err) {
        console.error(err);
        showToast(err.message || 'حدث خطأ');
    }
});
