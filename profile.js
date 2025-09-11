document.addEventListener('DOMContentLoaded', function() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser) {
        alert('يرجى تسجيل الدخول أولاً!');
        window.location.href = 'login.html';
        return;
    }

    // تحميل البيانات
    let students = JSON.parse(localStorage.getItem('students')) || [];
    let admins = JSON.parse(localStorage.getItem('admins')) || [];

    // تحديد نوع المستخدم وبياناته
    let userData = null;
    if (loggedInUser.type === 'admin') {
        userData = admins.find(admin => admin.username === loggedInUser.username);
        document.getElementById('admin-badge').style.display = 'inline';
    } else {
        userData = students.find(student => student.username === loggedInUser.username);
    }

    if (!userData) {
        alert('لم يتم العثور على بيانات المستخدم!');
        window.location.href = 'splash.html';
        return;
    }

    // تحديث بيانات المستخدم إذا لم تكن تحتوي على الحقول الجديدة
    userData.profile = userData.profile || {
        email: '',
        phone: '',
        birthdate: '',
        address: '',
        bio: ''
    };

    // عرض البيانات
    document.getElementById('user-name').textContent = userData.fullName || userData.name;
    document.getElementById('full-name').value = userData.fullName || userData.name;
    document.getElementById('username').value = userData.username;
    document.getElementById('email').value = userData.profile.email;
    document.getElementById('phone').value = userData.profile.phone;
    document.getElementById('birthdate').value = userData.profile.birthdate;
    document.getElementById('address').value = userData.profile.address;
    document.getElementById('bio').value = userData.profile.bio;

    // حساب نسبة اكتمال الملف
    function calculateProgress() {
        const fields = ['email', 'phone', 'birthdate', 'address', 'bio'];
        let completed = 0;
        fields.forEach(field => {
            if (userData.profile[field].trim()) {
                completed++;
            }
        });
        const progress = (completed / fields.length) * 100;
        document.getElementById('profile-progress').value = progress;
        document.getElementById('progress-percentage').textContent = `${progress.toFixed(0)}%`;
        return progress;
    }

    calculateProgress();

    // التعامل مع تحديث الملف
    document.getElementById('profile-form').addEventListener('submit', function(e) {
        e.preventDefault();

        const oldProfile = { ...userData.profile };
        userData.profile.email = document.getElementById('email').value.trim();
        userData.profile.phone = document.getElementById('phone').value.trim();
        userData.profile.birthdate = document.getElementById('birthdate').value;
        userData.profile.address = document.getElementById('address').value.trim();
        userData.profile.bio = document.getElementById('bio').value.trim();

        // التحقق من الحقول التي تم تحديثها
        let updatedFields = [];
        for (let field in userData.profile) {
            if (userData.profile[field] && !oldProfile[field]) {
                updatedFields.push(field);
            }
        }

        // حفظ البيانات
        if (loggedInUser.type === 'admin') {
            const index = admins.findIndex(admin => admin.username === loggedInUser.username);
            admins[index] = userData;
            localStorage.setItem('admins', JSON.stringify(admins));
        } else {
            const index = students.findIndex(student => student.username === loggedInUser.username);
            students[index] = userData;
            localStorage.setItem('students', JSON.stringify(students));
        }

        const progress = calculateProgress();
        if (updatedFields.length > 0) {
            alert(`تم تحديث ${updatedFields.length} حقل/حقول بنجاح! نسبة اكتمال ملفك الآن ${progress.toFixed(0)}% 😊`);
        }
        if (progress === 100) {
            alert('مبروك! لقد أكملت ملفك الشخصي بالكامل بنجاح! 🎉');
        }
    });

    // عرض النافبار
    // عرض النافبار
// عرض النافبار
const navBar = document.getElementById('nav-bar');
const navItems = [
    { href: 'index.html', icon: 'fas fa-home', title: 'الرئيسية' },
    { href: 'Home.html', icon: 'fas fa-chart-line', title: 'النتائج' },
    { href: 'profile.html', icon: 'fas fa-user', title: 'الملف الشخصي' }
];
if (loggedInUser.type === 'admin') {
    navItems.push({ href: 'admin.html', icon: 'fas fa-cogs', title: 'لوحة التحكم' });
}
navBar.innerHTML = navItems.map(item => `
    <a href="${item.href}" title="${item.title}"><i class="${item.icon}"></i></a>
`).join('');
});
