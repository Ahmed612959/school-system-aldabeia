// ================= Toast =================
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
        background-color: ${
            type === 'success' ? '#28a745' :
            type === 'info' ? '#007bff' : '#dc3545'
        };
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ================= API =================
const API_URL = "https://schoolx-five.vercel.app";

async function saveToServer(endpoint, data) {
    try {
        delete data._id; // 🔥 منع المشكلة نهائيًا

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'خطأ في الخادم');
        }

        return result;
    } catch (error) {
        console.error('خطأ في الاتصال:', error);
        throw error;
    }
}

// ================= Username Check =================
async function checkUsernameAvailability(username) {
    try {
        const response = await fetch(`${API_URL}/api/check-username`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const data = await response.json();
        return data.available === true;
    } catch (error) {
        console.error('خطأ في التحقق:', error);
        return false;
    }
}

// ================= Signup =================
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const studentId = document.getElementById('studentId').value.replace(/\s/g, '').trim();
    const phone = document.getElementById('phone').value.trim();
    const parentName = document.getElementById('parentName').value.trim();
    const parentId = document.getElementById('parentId').value.replace(/\s/g, '').trim();

    const availabilitySpan = document.getElementById('username-availability');
    availabilitySpan.style.display = 'none';

    // ================= Validation =================

    if (!fullName || !username || !password || !studentId || !phone || !parentName || !parentId) {
        showToast('املأ كل الحقول يا بطل', 'error');
        return;
    }

    // 🔥 هنا التعديل المهم (7 أرقام فقط)
    if (!/^\d{7}$/.test(studentId)) {
        showToast('اكتب آخر 7 أرقام من البطاقة بس', 'error');
        return;
    }

    if (!/^\d{14}$/.test(parentId)) {
        showToast('رقم ولي الأمر لازم 14 رقم', 'error');
        return;
    }

    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        showToast('اسم المستخدم غير صالح', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('كلمة المرور ضعيفة', 'error');
        return;
    }

    // ================= Username Check =================
    showToast('بنتأكد من اسم المستخدم...', 'info');

    const isAvailable = await checkUsernameAvailability(username);

    if (!isAvailable) {
        availabilitySpan.textContent = 'اسم المستخدم مستخدم';
        availabilitySpan.style.color = 'red';
        availabilitySpan.style.display = 'block';
        showToast('اسم المستخدم مستخدم', 'error');
        return;
    }

    availabilitySpan.textContent = 'متاح';
    availabilitySpan.style.color = 'green';
    availabilitySpan.style.display = 'block';

    // ================= Send =================
    try {
        showToast('جاري إنشاء الحساب...', 'info');

        const response = await saveToServer('/api/register-student', {
            fullName,
            username,
            studentId, // ✅ بدل id
            phone,
            parentName,
            parentId,
            password
        });

        showToast('تم إنشاء الحساب بنجاح 🎉', 'success');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);

    } catch (error) {
        console.error(error);

        const msg = error.message || '';

        if (msg.includes('studentId')) {
            showToast('الرقم ده متسجل قبل كده', 'error');
        } else if (msg.includes('username')) {
            showToast('اسم المستخدم مستخدم', 'error');
        } else if (msg.includes('parentId')) {
            showToast('رقم ولي الأمر مستخدم', 'error');
        } else {
            showToast(msg, 'error');
        }
    }
});

// ================= Live Username Check =================
let usernameTimeout;

document.getElementById('username')?.addEventListener('input', (e) => {
    const username = e.target.value.trim();
    const span = document.getElementById('username-availability');

    clearTimeout(usernameTimeout);

    if (!username) {
        span.style.display = 'none';
        return;
    }

    if (username.length < 3) {
        span.textContent = 'قصير جدًا';
        span.style.color = 'red';
        span.style.display = 'block';
        return;
    }

    span.textContent = 'جاري التحقق...';
    span.style.color = 'orange';
    span.style.display = 'block';

    usernameTimeout = setTimeout(async () => {
        const ok = await checkUsernameAvailability(username);
        span.textContent = ok ? 'متاح' : 'مش متاح';
        span.style.color = ok ? 'green' : 'red';
    }, 500);
});
