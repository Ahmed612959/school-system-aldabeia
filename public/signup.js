// ================= Toast =================
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 14px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 9999;
        background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        direction: rtl;
        text-align: right;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ================= Check Username =================
async function checkUsernameAvailability(username) {
    try {
        const res = await fetch('/api/check-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const data = await res.json();
        return data.available || false;
    } catch (err) {
        console.error('خطأ في التحقق من اسم المستخدم:', err);
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
        span.textContent = '❌ 3-20 حروف أو أرقام فقط (إنجليزي)';
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
    }, 600);
});

// ================= Submit Form =================
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // جلب القيم
    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    let studentCode = document.getElementById('studentId').value.trim();
    let phone = document.getElementById('phone').value.trim();
    const parentName = document.getElementById('parentName').value.trim();
    let parentId = document.getElementById('parentId').value.trim();

    // ================= تنظيف البيانات =================
    studentCode = studentCode.replace(/\D/g, ''); // إزالة أي حرف غير رقم
    parentId = parentId.replace(/\D/g, '');

    // ================= Validation =================
    if (!fullName || !username || !password || !studentCode || !phone || !parentName || !parentId) {
        return showToast('يرجى ملء جميع الحقول');
    }

    if (studentCode.length !== 7) {
        return showToast('رقم الجلوس لازم يكون 7 أرقام بالضبط');
    }

    if (parentId.length !== 14) {
        return showToast('رقم بطاقة ولي الأمر لازم يكون 14 رقم بالضبط');
    }

    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        return showToast('اسم المستخدم يجب أن يحتوي على 3-20 حرف أو رقم إنجليزي فقط');
    }

    if (password.length < 6) {
        return showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    // ================= Check Username Final =================
    const available = await checkUsernameAvailability(username);
    if (!available) {
        return showToast('اسم المستخدم مستخدم بالفعل، اختر اسم آخر');
    }

    // ================= إعداد البيانات النهائية =================
    const payload = {
        fullName,
        username: username.toLowerCase(),   // موحد
        password,
        studentCode,
        phone,
        parentName,
        parentId
    };

    console.log("🚀 Sending Payload:", payload);   // للتصحيح

    // ================= Send Data =================
    try {
        showToast('جاري إنشاء الحساب...', 'success');

        const res = await fetch('/api/register-student', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseText = await res.text();
        console.log("📥 Server Response:", responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { error: responseText };
        }

        if (!res.ok) {
            throw new Error(data.error || data.message || 'حدث خطأ أثناء إنشاء الحساب');
        }

        showToast('تم إنشاء الحساب بنجاح 🎉', 'success');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1800);

    } catch (err) {
        console.error('❌ Signup Error:', err);
        showToast(err.message || 'حدث خطأ غير متوقع، حاول مرة أخرى');
    }
});
