document.addEventListener('DOMContentLoaded', async function () {
    const BASE_URL = 'https://schoolx-five.vercel.app';

    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser) {
        alert('يرجى تسجيل الدخول أولاً!');
        window.location.href = 'login.html';
        return;
    }

    // دالة جلب البيانات من السيرفر
    async function getFromServer(endpoint) {
        try {
            const cleanEndpoint = endpoint.replace(/^\/+/, '');
            const response = await fetch(`${BASE_URL}/api/${cleanEndpoint}`);
            if (!response.ok) throw new Error('فشل جلب البيانات');
            return await response.json();
        } catch (err) {
            console.error(err);
            showToast('فشل الاتصال بالسيرفر! تحقق من الإنترنت.', 'error');
            return null;
        }
    }

    // دالة حفظ البيانات على السيرفر
    async function saveToServer(endpoint, data) {
        try {
            const response = await fetch(`${BASE_URL}/api/${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('فشل الحفظ');
            return await response.json();
        } catch (err) {
            console.error(err);
            showToast('فشل حفظ البيانات! تحقق من الاتصال.', 'error');
            return null;
        }
    }

    // جلب بيانات المستخدم
    let userData = null;
    if (loggedInUser.type === 'admin') {
        const admins = await getFromServer('admins');
        userData = admins?.find(a => a.username === loggedInUser.username);
        if (userData) document.getElementById('admin-badge')?.style = 'display:inline-block';
    } else {
        const students = await getFromServer('students');
        userData = students?.find(s => s.username === loggedInUser.username);
    }

    if (!userData) {
        alert('لم يتم العثور على بياناتك! حاول تسجيل الدخول مرة أخرى.');
        window.location.href = 'login.html';
        return;
    }

    // تهيئة الحقول الإضافية إذا كانت مفقودة
    userData.profile = userData.profile || {
        email: '',
        phone: '',
        birthdate: '',
        address: '',
        bio: ''
    };

    // عرض البيانات في النموذج
    document.getElementById('user-name').textContent = userData.fullName || userData.name || userData.username;
    document.getElementById('full-name').value = userData.fullName || userData.name || '';
    document.getElementById('username').value = userData.username;
    document.getElementById('email').value = userData.profile.email || '';
    document.getElementById('phone').value = userData.profile.phone || '';
    document.getElementById('birthdate').value = userData.profile.birthdate || '';
    document.getElementById('address').value = userData.profile.address || '';
    document.getElementById('bio').value = userData.profile.bio || '';

    // حساب نسبة اكتمال الملف
    function updateProgress() {
        const fields = ['email', 'phone', 'birthdate', 'address', 'bio'];
        const completed = fields.filter(f => userData.profile[f]?.trim()).length;
        const progress = (completed / fields.length) * 100;

        const progressBar = document.getElementById('profile-progress');
        const percentageText = document.getElementById('progress-percentage');
        if (progressBar) progressBar.value = progress;
        if (percentageText) percentageText.textContent = `${progress.toFixed(0)}%`;

        return progress;
    }
    updateProgress();

    // حفظ التعديلات
    document.getElementById('profile-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();

        const updatedProfile = {
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            birthdate: document.getElementById('birthdate').value,
            address: document.getElementById('address').value.trim(),
            bio: document.getElementById('bio').value.trim()
        };

        // تحديث البيانات محليًا
        userData.profile = updatedProfile;

        // تحديد الـ endpoint الصحيح
        const endpoint = loggedInUser.type === 'admin' 
            ? `admins/${loggedInUser.username}` 
            : `students/${loggedInUser.username}`;

        const saved = await saveToServer(endpoint, { profile: updatedProfile });

        if (saved) {
            const progress = updateProgress();
            showToast('تم حفظ بياناتك بنجاح!', 'success');

            if (progress === 100) {
                setTimeout(() => {
                    showToast('مبروك! أكملت ملفك الشخصي 100%!', 'success');
                }, 1000);
            }
        }
    });

    // النافبار موحد مع باقي الصفحات
    const navBar = document.getElementById('nav-bar');
    const navItems = [
        { href: 'index.html', icon: 'fas fa-home', title: 'الرئيسية' },
        { href: 'Home.html', icon: 'fas fa-chart-line', title: 'النتائج' },
        { href: 'profile.html', icon: 'fas fa-user', title: 'الملف الشخصي' },
        { href: 'exams.html', icon: 'fas fa-book', title: 'الاختبارات' },
        { href: 'chatbot.html', icon: 'fas fa-robot', title: 'المساعد الذكي' }
    ];

    if (loggedInUser.type === 'admin') {
        navItems.push({ href: 'admin.html', icon: 'fas fa-cogs', title: 'لوحة التحكم' });
    }

    navBar.innerHTML = navItems.map(item => 
        `<a href="${item.href}" title="${item.title}"><i class="${item.icon}"></i></a>`
    ).join('');

    // Toast جميل وموحد
    function showToast(message, type = 'success') {
        const bg = type === 'success' ? '#28a745' : '#dc3545';
        Toastify({
            text: message,
            duration: 4000,
            gravity: "top",
            position: "right",
            backgroundColor: bg,
            style: {
                fontFamily: '"Tajawal", sans-serif',
                fontSize: "18px",
                padding: "20px 30px",
                borderRadius: "12px",
                direction: "rtl",
                textAlign: "right",
                boxShadow: "0 8px 30px rgba(0,0,0,0.3)"
            }
        }).showToast();
    }
}); 
