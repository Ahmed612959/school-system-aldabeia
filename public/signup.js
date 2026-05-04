// دالة لعرض رسائل التنبيه
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
        background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// إرسال طلب إلى الخادم
async function saveToServer(endpoint, data) {
    try {
        const response = await fetch(endpoint, {
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
        console.error('خطأ في الاتصال بالخادم:', error);
        throw error;
    }
}

// ====================== معالجة نموذج إنشاء حساب الطالب ======================
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName   = document.getElementById('fullName').value.trim();
    const username   = document.getElementById('username').value.trim();
    const password   = document.getElementById('password').value.trim();
    const parentName = document.getElementById('parentName').value.trim();
    const parentId   = document.getElementById('parentId').value.replace(/\s/g, '').trim();

    const availabilitySpan = document.getElementById('username-availability');

    // التحقق من ملء جميع الحقول
    if (!fullName || !username || !password || !parentName || !parentId) {
        showToast('يرجى ملء جميع الحقول!', 'error');
        return;
    }

    // التحقق من رقم بطاقة ولي الأمر
    if (parentId.length !== 14 || !/^\d{14}$/.test(parentId)) {
        showToast('رقم بطاقة ولي الأمر يجب أن يكون 14 رقم بالظبط!', 'error');
        return;
    }

    // التحقق من صيغة اسم المستخدم
    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        showToast('اسم المستخدم: 3-20 حرف إنجليزي وأرقام فقط!', 'error');
        return;
    }

    try {
        showToast('جاري إنشاء الحساب...', 'info');

        const result = await saveToServer('/api/register-student', {
            fullName,
            username,
            parentName,
            parentId,
            password
        });

        showToast(`✅ تم إنشاء الحساب بنجاح! اسم المستخدم: ${username}`, 'success');

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2500);

    } catch (error) {
        console.error('Register Error:', error);
        const msg = (error.message || error || '').toString();

        if (msg.includes('غير مسموح به') || msg.includes('اسم المستخدم غير مسموح')) {
            showToast('اسم المستخدم غير مسموح به. تواصل مع الإدارة للحصول على اسم مستخدم صالح.', 'error');
        } else if (msg.includes('اسم المستخدم مستخدم من قبل')) {
            showToast('اسم المستخدم مستخدم من قبل!', 'error');
        } else if (msg.includes('ولي الأمر') || msg.includes('parentId')) {
            showToast('رقم بطاقة ولي الأمر مستخدم من قبل!', 'error');
        } else {
            showToast(`خطأ في إنشاء الحساب: ${msg}`, 'error');
        }
    }
});

// ====================== التحقق من اسم المستخدم أثناء الكتابة ======================
let usernameTimeout;
document.getElementById('username')?.addEventListener('input', async (e) => {
    const username = e.target.value.trim();
    const availabilitySpan = document.getElementById('username-availability');

    clearTimeout(usernameTimeout);

    if (username.length === 0) {
        availabilitySpan.style.display = 'none';
        return;
    }

    // التحقق الأولي من الصيغة
    if (username.length < 3 || !/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        availabilitySpan.textContent = 'يجب أن يكون 3-20 حرف (أحرف وأرقام فقط)';
        availabilitySpan.style.color = '#dc3545';
        availabilitySpan.style.display = 'block';
        return;
    }

    availabilitySpan.textContent = 'جاري التحقق...';
    availabilitySpan.style.color = '#ffc107';
    availabilitySpan.style.display = 'block';

    usernameTimeout = setTimeout(async () => {
        try {
            const response = await fetch('/api/check-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            const data = await response.json();

            if (data.available === true) {
                availabilitySpan.textContent = '✅ متاح ومسموح';
                availabilitySpan.style.color = '#28a745';
            } else {
                availabilitySpan.textContent = data.error || 'غير متاح!';
                availabilitySpan.style.color = '#dc3545';
            }
        } catch (err) {
            console.error(err);
            availabilitySpan.textContent = 'خطأ في التحقق';
            availabilitySpan.style.color = '#dc3545';
        }
    }, 600);
});