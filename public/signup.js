function showToast(message, type = 'error') {
    alert(message); // بسيط مؤقت
}

// إرسال البيانات
async function saveToServer(data) {
    const res = await fetch('/api/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await res.json();

    if (!res.ok) throw new Error(result.error);

    return result;
}

// التحقق من username
async function checkUsername(username) {
    const res = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });

    const data = await res.json();
    return data.available;
}

// submit
document.getElementById('student-signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = fullName.value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const id = document.getElementById('studentId').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const parentName = document.getElementById('parentName').value.trim();
    const parentId = document.getElementById('parentId').value.trim();

    // ✅ validations
    if (!/^\d{7}$/.test(id)) {
        return showToast('لازم تكتب 7 أرقام بس');
    }

    if (!/^\d{14}$/.test(parentId)) {
        return showToast('رقم ولي الأمر لازم 14 رقم');
    }

    if (password.length < 6) {
        return showToast('كلمة المرور ضعيفة');
    }

    const available = await checkUsername(username);
    if (!available) return showToast('اسم المستخدم مستخدم');

    try {
        const res = await saveToServer({
            fullName,
            username,
            password,
            id,
            phone,
            parentName,
            parentId
        });

        showToast('تم إنشاء الحساب بنجاح', 'success');
        location.href = 'login.html';

    } catch (err) {
        showToast(err.message);
    }
});
