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
async function registerStudent(data) {
    console.log("📦 DATA SENT:", data);

    const res = await fetch('/api/register-student', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    const text = await res.text(); // مهم جدًا للتشخيص

    let result;
    try {
        result = JSON.parse(text);
    } catch {
        console.error("❌ Invalid JSON:", text);
        throw new Error("Server returned invalid response");
    }

    if (!res.ok) {
        console.error("❌ SERVER ERROR:", result);
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
    if (Object.values(data).some(v => !v)) {
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
