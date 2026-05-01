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

// ================= REGISTER =================
async function registerStudent(data) {

    console.log("📤 SENDING:", data);

    const res = await fetch('/api/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await res.json();

    console.log("📥 RESPONSE:", result);

    if (!res.ok) {
        throw new Error(result.error);
    }

    return result;
}

// ================= SUBMIT =================
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

    // validation
    for (const key in data) {
        if (!data[key]) {
            return showToast(`الحقل ${key} فارغ ❌`);
        }
    }

    try {
        showToast('جاري إنشاء الحساب...', 'info');

        await registerStudent(data);

        showToast('تم إنشاء الحساب بنجاح ✅', 'success');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);

    } catch (err) {
        showToast(err.message);
    }
});

// ================= LIVE CHECK =================
let timer;

document.getElementById('username')?.addEventListener('input', (e) => {
    const username = e.target.value.trim();
    const span = document.getElementById('username-availability');

    clearTimeout(timer);

    if (!username) {
        span.style.display = 'none';
        return;
    }

    span.style.display = 'block';
    span.textContent = 'جاري التحقق...';
    span.style.color = 'orange';

    timer = setTimeout(async () => {
        try {
            const res = await fetch('/api/check-username', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username })
            });

            const data = await res.json();

            span.textContent = data.available ? 'متاح ✓' : 'غير متاح ✗';
            span.style.color = data.available ? 'green' : 'red';

        } catch {
            span.textContent = 'خطأ';
            span.style.color = 'red';
        }
    }, 400);
});
