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

// التحقق من توفر اسم المستخدم
async function checkUsernameAvailability(username) {
    try {
        const response = await fetch('/api/check-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await response.json();
        return data.available;
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
}

// معالجة نموذج إنشاء حساب الطالب
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value.trim();
    const username = document.getElementById('username').value.trim();
    const studentCodeNumbers = document.getElementById('studentCode').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const birthdate = document.getElementById('birthdate').value;
    const address = document.getElementById('address').value.trim();
    const password = document.getElementById('password').value;

    // التحقق من صحة الحقول
    if (!fullName || !username || !studentCodeNumbers || !email || !phone || !birthdate || !address || !password) {
        showToast('Please fill in all fields!', 'error');
        return;
    }

    // التحقق من أن كود الطالب يحتوي على 3 أرقام
    if (!/^\d{3}$/.test(studentCodeNumbers)) {
        showToast('Student code must be exactly 3 digits!', 'error');
        return;
    }

    // التحقق من صيغة اسم المستخدم (مثال: 3-20 حرفًا، أحرف وأرقام فقط)
    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        showToast('Username must be 3-20 characters (letters and numbers only)!', 'error');
        return;
    }

    // التحقق من توفر اسم المستخدم
    const isUsernameAvailable = await checkUsernameAvailability(username);
    const availabilitySpan = document.getElementById('username-availability');
    if (!isUsernameAvailable) {
        availabilitySpan.textContent = 'اسم المستخدم غير متاح!';
        availabilitySpan.style.display = 'block';
        return;
    } else {
        availabilitySpan.textContent = 'اسم المستخدم متاح!';
        availabilitySpan.style.color = '#28a745';
        availabilitySpan.style.display = 'block';
    }

    // دمج STU مع الأرقام
    const studentCode = `STU${studentCodeNumbers}`;

    try {
        const response = await saveToServer('/api/register-student', {
            fullName,
            username,
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

// التحقق من توفر اسم المستخدم عند الكتابة
document.getElementById('username')?.addEventListener('input', async (e) => {
    const username = e.target.value.trim();
    const availabilitySpan = document.getElementById('username-availability');

    if (username.length < 3 || !/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        availabilitySpan.textContent = 'اسم المستخدم يجب أن يكون 3-20 حرفًا (أحرف وأرقام فقط)!';
        availabilitySpan.style.color = '#dc3545';
        availabilitySpan.style.display = 'block';
        return;
    }

    const isAvailable = await checkUsernameAvailability(username);
    availabilitySpan.textContent = isAvailable ? 'اسم المستخدم متاح!' : 'اسم المستخدم غير متاح!';
    availabilitySpan.style.color = isAvailable ? '#28a745' : '#dc3545';
    availabilitySpan.style.display = 'block';
});
