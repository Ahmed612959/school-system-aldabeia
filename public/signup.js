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
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ================= REGISTER API =================
async function registerStudent(data) {
    console.log("📦 FINAL DATA SENT:", data);

    const res = await fetch('/api/register-student', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    const result = await res.json();

    console.log("📩 SERVER RESPONSE:", result);

    if (!res.ok) {
        throw new Error(result.error || 'Server Error');
    }

    return result;
}

// ================= SIGNUP =================
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone').value.trim();
    const parentName = document.getElementById('parentName').value.trim();
    const parentId = document.getElementById('parentId').value.trim();
    const year = document.getElementById('year').value;

    // 🔥 مهم جدًا: لازم كل الحقول تبقى موجودة
    const data = {
        fullName,
        username,
        password,
        phone,
        parentName,
        parentId,
        year
    };

    console.log("🧾 FORM DATA:", data);

    // validation قوي
    if (
        !fullName ||
        !username ||
        !password ||
        !phone ||
        !parentName ||
        !parentId ||
        !year
    ) {
        return showToast('يرجى ملء جميع الحقول!', 'error');
    }

    try {
        showToast('جاري إنشاء الحساب...', 'info');

        await registerStudent(data);

        showToast('تم إنشاء الحساب بنجاح!', 'success');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);

    } catch (err) {
        showToast(err.message, 'error');
    }
});

// ================= LIVE USERNAME CHECK =================
let timer;

document.getElementById('username')?.addEventListener('input', (e) => {
    const username = e.target.value.trim();
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

            const ok = data.available;

            span.style.color = ok ? 'green' : 'red';
            span.textContent = ok ? 'متاح ✓' : 'غير متاح ✗';

        } catch (err) {
            span.style.color = 'red';
            span.textContent = 'خطأ في التحقق';
        }
    }, 400);
});
