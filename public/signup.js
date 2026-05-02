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
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ================= REGISTER =================
async function registerStudent() {

    const data = {
        fullName: document.getElementById('fullName').value.trim(),
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value.trim(),
        parentName: document.getElementById('parentName').value.trim(),
        parentId: document.getElementById('parentId').value.trim(),
        year: document.getElementById('year').value
    };

    console.log("🚀 SENDING:", data);

    // ✅ VALIDATION
    for (let key in data) {
        if (!data[key]) {
            showToast("كل الحقول مطلوبة", "error");
            return;
        }
    }

    try {
        const res = await fetch('/api/register-student', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        console.log("📥 RESPONSE:", result);

        if (!res.ok) {
            throw new Error(result.error || "خطأ في السيرفر");
        }

        showToast("تم التسجيل بنجاح ✅", "success");

        // ✅ تفريغ الفورم بدل ما الصفحة تعمل reload
        document.getElementById('signup-form').reset();

        // ✅ تحويل بعد ثانيتين (اختياري)
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);

    } catch (err) {
        console.error(err);
        showToast(err.message, "error");
    }
}

// ================= منع الريلود =================
document.getElementById('student-signup-form')?.addEventListener('submit', function (e) {
    e.preventDefault(); // 🔥 يمنع الريلود
    registerStudent();
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
