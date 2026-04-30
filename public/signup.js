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

// ================= API =================
async function saveToServer(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) {
        throw new Error(result.error || 'Server Error');
    }

    return result;
}

async function checkUsernameAvailability(username) {
    const res = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });

    const data = await res.json();
    return data.available;
}

// ================= SIGNUP =================
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone').value.trim();
    const parentName = document.getElementById('parentName').value.trim();
    const parentId = document.getElementById('parentId').value.trim();
    const year = document.getElementById('year').value;

    const span = document.getElementById('username-availability');

    // ===== validation =====
    if (
        !fullName ||
        !username ||
        !password ||
        !phone ||
        !parentName ||
        !parentId ||
        !year
    ) {
        return showToast('من فضلك املأ جميع الحقول', 'error');
    }

    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        return showToast('اسم المستخدم 3-20 حرف وأرقام فقط', 'error');
    }

    if (!/^\d{14}$/.test(parentId)) {
        return showToast('رقم البطاقة يجب أن يكون 14 رقم', 'error');
    }

    try {
        showToast('جاري التحقق...', 'info');

        const available = await checkUsernameAvailability(username);

        if (!available) {
            span.style.display = 'block';
            span.style.color = 'red';
            span.textContent = 'اسم المستخدم مستخدم';
            return showToast('اسم المستخدم غير متاح', 'error');
        }

        const result = await saveToServer('/api/register-student', {
            fullName,
            username,
            password,
            phone,
            parentName,
            parentId,
            year
        });

        showToast('تم إنشاء الحساب بنجاح 🎉', 'success');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);

    } catch (err) {
        showToast(err.message, 'error');
    }
});

// ================= LIVE CHECK =================
let timer;

document.getElementById('username')?.addEventListener('input', (e) => {
    const username = e.target.value.trim();
    const span = document.getElementById('username-availability');

    clearTimeout(timer);

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
        const ok = await checkUsernameAvailability(username);

        span.style.color = ok ? 'green' : 'red';
        span.textContent = ok ? 'متاح ✓' : 'غير متاح ✗';
    }, 400);
});
