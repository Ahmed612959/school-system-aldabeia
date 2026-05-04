// ================= Toast =================
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 14px 22px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 9999;
        background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        box-shadow: 0 4px 15px rgba(0,0,0,0.25);
        direction: rtl;
        text-align: right;
        max-width: 90%;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
}

// ================= Check Username =================
async function checkUsernameAvailability(username) {
    try {
        const res = await fetch('/api/check-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        return data.available || false;
    } catch (err) {
        console.error('خطأ في التحقق من اسم المستخدم:', err);
        return false;
    }
}

// ================= Live Username Check =================
let usernameTimeout;

document.getElementById('username')?.addEventListener('input', (e) => {
    const username = e.target.value.trim();
    const span = document.getElementById('username-availability');

    clearTimeout(usernameTimeout);

    if (username.length < 3) {
        span.style.display = 'none';
        return;
    }

    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        span.textContent = '❌ 3-20 حرف أو رقم إنجليزي فقط';
        span.style.color = '#e74c3c';
        span.style.display = 'block';
        return;
    }

    span.textContent = '⏳ جاري التحقق...';
    span.style.color = '#f39c12';
    span.style.display = 'block';

    usernameTimeout = setTimeout(async () => {
        const isAvailable = await checkUsernameAvailability(username);
        if (isAvailable) {
            span.textContent = '✔ اسم المستخدم متاح';
            span.style.color = '#2ecc71';
        } else {
            span.textContent = '❌ اسم المستخدم مستخدم';
            span.style.color = '#e74c3c';
        }
    }, 600);
});

// ================= Submit Form =================
document.getElementById('student-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // جلب القيم من الحقول
    const fullName   = document.getElementById('fullName').value.trim();
    const usernameInput = document.getElementById('username').value.trim();
    const password   = document.getElementById('password').value;
    let studentCode  = document.getElementById('studentId').value.trim();
    let phone        = document.getElementById('phone').value.trim();
    const parentName = document.getElementById('parentName').value.trim();
    let parentId     = document.getElementById('parentId').value.trim();

    // تنظيف البيانات
    const username = usernameInput.toLowerCase();
    studentCode = studentCode.replace(/\D/g, '');
    parentId = parentId.replace(/\D/g, '');

    // ================= Logging مفصل للتصحيح =================
    console.log("══════════════════════════════════════");
    console.log("📋 البيانات الأصلية من النموذج:");
    console.log({
        fullName,
        usernameInput,
        passwordLength: password.length,
        studentCodeRaw: document.getElementById('studentId').value,
        phone,
        parentName,
        parentIdRaw: document.getElementById('parentId').value
    });

    console.log("🧹 البيانات بعد التنظيف:");
    console.log({
        fullName,
        username,
        passwordLength: password.length,
        studentCode,
        phone,
        parentName,
        parentId
    });
    console.log("══════════════════════════════════════");

    // Validation على الـ client
    if (!fullName || !username || !password || !studentCode || !phone || !parentName || !parentId) {
        return showToast('يرجى ملء جميع الحقول');
    }

    if (studentCode.length !== 7) {
        return showToast('رقم الجلوس لازم يكون 7 أرقام بالضبط');
    }

    if (parentId.length !== 14) {
        return showToast('رقم بطاقة ولي الأمر لازم يكون 14 رقم بالضبط');
    }

    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
        return showToast('اسم المستخدم غير صالح (3-20 حرف أو رقم إنجليزي فقط)');
    }

    if (password.length < 6) {
        return showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }

    // التحقق من توفر اسم المستخدم
    const available = await checkUsernameAvailability(username);
    if (!available) {
        return showToast('اسم المستخدم مستخدم بالفعل، اختر اسم آخر');
    }

    // ================= إنشاء FormData (التعديل الجديد) =================
    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('username', username);
    formData.append('password', password);
    formData.append('studentCode', studentCode);
    formData.append('phone', phone);
    formData.append('parentName', parentName);
    formData.append('parentId', parentId);

    console.log("🚀 جاري إرسال البيانات باستخدام FormData...");

    // ================= إرسال الطلب =================
    // ====================== REGISTER STUDENT - الحل المحسن (JSON) ======================
app.post('/api/register-student', async (req, res) => {
    try {
        console.log("=== REGISTER STUDENT START ===");
        console.log("📌 Content-Type:", req.headers['content-type']);
        console.log("📥 Raw req.body:", JSON.stringify(req.body, null, 2));
        console.log("📋 Keys received:", Object.keys(req.body || {}));

        const fullName   = String(req.body.fullName || '').trim();
        const username   = String(req.body.username || '').trim().toLowerCase();
        const password   = String(req.body.password || '').trim();
        let studentCode  = String(req.body.studentCode || '').trim().replace(/\D/g, '');
        let phone        = String(req.body.phone || '').trim();
        const parentName = String(req.body.parentName || '').trim();
        let parentId     = String(req.body.parentId || '').trim().replace(/\D/g, '');

        console.log("🧹 Cleaned Data:", { 
            fullName, 
            username, 
            studentCode, 
            phone, 
            parentName, 
            parentId, 
            passwordLength: password.length 
        });

        if (!fullName || !username || !password || !studentCode || !phone || !parentName || !parentId) {
            return res.status(400).json({ 
                error: 'جميع الحقول مطلوبة',
                debug: {
                    fullName: !!fullName,
                    username: !!username,
                    password: !!password,
                    studentCode: !!studentCode,
                    phone: !!phone,
                    parentName: !!parentName,
                    parentId: !!parentId,
                    receivedKeys: Object.keys(req.body || {})
                }
            });
        }

        if (studentCode.length !== 7) return res.status(400).json({ error: 'رقم الجلوس لازم 7 أرقام' });
        if (parentId.length !== 14) return res.status(400).json({ error: 'رقم ولي الأمر لازم 14 رقم' });
        if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) return res.status(400).json({ error: 'اسم المستخدم غير صالح' });
        if (password.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });

        const [existCode, existUser] = await Promise.all([
            Student.findOne({ studentCode }),
            Student.findOne({ username })
        ]);

        if (existCode) return res.status(400).json({ error: 'هذا الكود مستخدم بالفعل' });
        if (existUser) return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' });

        const hashed = await bcrypt.hash(password, 10);

        const student = new Student({
            fullName,
            username,
            studentCode,
            password: hashed,
            profile: { phone, parentName, parentId }
        });

        await student.save();

        console.log(`✅ تم إنشاء الطالب بنجاح: ${username}`);

        res.json({ 
            success: true,
            message: 'تم إنشاء الحساب بنجاح 🎉',
            username 
        });

    } catch (err) {
        console.error('🔥 Register Error:', err);
        res.status(500).json({ 
            error: 'حدث خطأ في السيرفر', 
            details: err.message 
        });
    }
});
