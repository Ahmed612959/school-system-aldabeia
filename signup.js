// دالة لعرض رسائل التنبيه
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '5px';
    toast.style.color = 'white';
    toast.style.backgroundColor = type === 'success' ? '#28a745' : '#dc3545';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// إرسال طلب إلى الخادم
async function saveToServer(endpoint, data) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server error');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
}

// معالجة نموذج إنشاء حساب الطالب
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value.trim();
    const studentCodeNumbers = document.getElementById('studentCode').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const birthdate = document.getElementById('birthdate').value;
    const address = document.getElementById('address').value.trim();
    const password = document.getElementById('password').value;

    // التحقق من صحة الحقول
    if (!fullName || !studentCodeNumbers || !email || !phone || !birthdate || !address || !password) {
        showToast('Please fill in all fields!', 'error');
        return;
    }

    // التحقق من أن كود الطالب يحتوي على 3 أرقام
    if (!/^\d{3}$/.test(studentCodeNumbers)) {
        showToast('Student code must be exactly 3 digits!', 'error');
        return;
    }

    // دمج STU مع الأرقام
    const studentCode = `STU${studentCodeNumbers}`;

    try {
        const response = await saveToServer('/api/register-student', {
            fullName,
            id: studentCode,
            email,
            phone,
            birthdate,
            address,
            password
        });
        showToast(`Account created successfully! Username: ${response.username}`, 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
    } catch (error) {
        console.error('Error creating account:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
});
