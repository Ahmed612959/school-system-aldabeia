// ================= TOAST =================
function showToast(message, type = 'error') {
    const toast = document.createElement('div');

    toast.textContent = message;

    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: #fff;
        font-weight: bold;
        z-index: 9999;
        background: ${
            type === 'success' ? '#28a745' :
            type === 'info' ? '#17a2b8' :
            '#dc3545'
        };
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = '0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ================= REGISTER API =================
async function registerStudent(data) {
    console.log("📦 SENDING DATA:", data);

    const res = await fetch('/api/register-student', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    // 🔥 قراءة آمنة للرد
    let result;
    const text = await res.text();

    try {
        result = JSON.parse(text);
    } catch {
        result = { error: text };
    }

    console.log("📩 SERVER RESPONSE:", result);

    if (!res.ok) {
        throw new Error(result.error || 'Server Error');
    }

    return result;
}

// ================= SIGNUP FORM =================
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        fullName: document.getElementById('fullName').value.trim(),
        username: document.getElementById('username').value.trim().toLowerCase(),
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value.trim(),
        parentName: document.getElementById('parentName').value.trim(),
        parentId: document.getElementById('parentId').value.trim(),
        year: document.getElementById('year').value
    };

    console.log("🧾 FORM DATA:", data);

    // ================= VALIDATION =================
    const hasEmpty = Object.values(data).some(v => !v);

    if (hasEmpty) {
        return showToast('يرجى ملء جميع الحقول!', 'error');
    }

    try {
        showToast('جاري إنشاء الحساب...', 'info');

        await registerStudent(data);

        showToast('تم إنشاء الحساب بنجاح!', 'success');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1200);

    } catch (err) {
        showToast(err.message, 'error');
    }
});

// ================= USERNAME CHECK =================
let timer;

document.getElementById('username')?.addEventListener('input', (e) => {
    const username = e.target.value.trim().toLowerCase();
    const span = document.getElementById('username-availability');

    clearTimeout(timer);

    if (!username) {
        span.style.display = 'none';
        return;
    }

    if (username.length < 3) {
        span.style.display = 'block';
        span.style.color = 'red';
        span.textContent = 'قصير جدًا';
        return;
    }

    span.style.display = 'block';
    span.style.color = 'orange';
    span.textContent = 'جاري التحقق...';

    timer = setTimeout(async () => {
        try {
            const res = await fetch('/api/check-username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });

            const data = await res.json();

            span.style.color = data.available ? 'green' : 'red';
            span.textContent = data.available ? 'متاح ✓' : 'غير متاح ✗';

        } catch {
            span.style.color = 'red';
            span.textContent = 'خطأ في التحقق';
        }
    }, 400);
});
