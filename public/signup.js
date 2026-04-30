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
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        background-color: ${
            type === 'success' ? '#28a745' :
            type === 'info' ? '#17a2b8' :
            '#dc3545'
        };
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ================== REQUEST ==================
async function saveToServer(endpoint, data) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'خطأ في السيرفر');
        }

        return result;

    } catch (error) {
        console.error(error);
        throw error;
    }
}

// ================== USERNAME CHECK ==================
async function checkUsernameAvailability(username) {
    try {
        const res = await fetch('/api/check-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const data = await res.json();
        return data.available === true;

    } catch (err) {
        console.error(err);
        return false;
    }
}

// ================== SIGNUP ==================
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone').value.trim();
    const parentName = document.getElementById('parentName').value.trim();
    const parentId = document.getElementById('parentId').value.replace(/\s/g, '');
    const year = document.getElementById('year').value;

    const availabilitySpan = document.getElementById('username-availability');

    // ===== validation =====
    if (!fullName || !username || !password || !phone || !parentName || !parentId || !year) {
        return showToast('يرجى ملء جميع الحقول!', 'error');
    }

    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        return showToast('اسم المستخدم 3-20 حرف وأرقام فقط!', 'error');
    }

    if (!/^\d{14}$/.test(parentId)) {
        return showToast('رقم بطاقة ولي الأمر يجب أن يكون 14 رقم!', 'error');
    }

    // ===== check username =====
    showToast('جاري التحقق من اسم المستخدم...', 'info');

    const available = await checkUsernameAvailability(username);

    if (!available) {
        if (availabilitySpan) {
            availabilitySpan.textContent = 'اسم المستخدم مستخدم';
            availabilitySpan.style.color = '#dc3545';
            availabilitySpan.style.display = 'block';
        }
        return showToast('اسم المستخدم غير متاح!', 'error');
    }

    // ===== success availability =====
    if (availabilitySpan) {
        availabilitySpan.textContent = 'اسم المستخدم متاح ✓';
        availabilitySpan.style.color = '#28a745';
        availabilitySpan.style.display = 'block';
    }

    try {
        showToast('جاري إنشاء الحساب...', 'info');

        const res = await saveToServer('/api/register-student', {
            fullName,
            username,
            phone,
            parentName,
            parentId,
            password,
            year
        });

        showToast('تم إنشاء الحساب بنجاح!', 'success');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);

    } catch (err) {
        showToast(err.message || 'حدث خطأ', 'error');
    }
});

// ================== LIVE USERNAME CHECK ==================
let timer;

document.getElementById('username')?.addEventListener('input', (e) => {
    const username = e.target.value.trim();
    const span = document.getElementById('username-availability');

    clearTimeout(timer);

    if (!username) {
        if (span) span.style.display = 'none';
        return;
    }

    if (username.length < 3) {
        span.textContent = 'قصير جدًا';
        span.style.color = '#dc3545';
        span.style.display = 'block';
        return;
    }

    span.textContent = 'جاري التحقق...';
    span.style.color = '#ffc107';
    span.style.display = 'block';

    timer = setTimeout(async () => {
        const ok = await checkUsernameAvailability(username);

        span.textContent = ok ? 'متاح ✓' : 'غير متاح ✗';
        span.style.color = ok ? '#28a745' : '#dc3545';
    }, 500);
});
