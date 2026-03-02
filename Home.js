document.addEventListener('DOMContentLoaded', function() {
    // دالة لجلب البيانات من الخادم
    async function getFromServer(endpoint) {
        try {
            const cleanEndpoint = endpoint.replace(/^\/+/, ''); // إزالة / زائدة
            const response = await fetch(`https://school-system-aldabeia-production-33db.up.railway.app/${cleanEndpoint}`);
            if (!response.ok) {
                throw new Error(`خطأ ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            console.log(`Data loaded from server for ${cleanEndpoint}:`, data.length, 'items');
            return data || [];
        } catch (error) {
            console.error(`Error fetching from ${endpoint}:`, error);
            showToast(`خطأ في جلب البيانات من ${endpoint}! تأكد من الخادم.`, 'error');
            return [];
        }
    }

    // جلب البيانات
    let students = [];
    let violations = [];
    async function loadInitialData() {
        students = await getFromServer('/api/students');
        violations = await getFromServer('/api/violations');
    }

    // عرض الإشعارات
    async function renderNotifications() {
        const notifications = await getFromServer('/api/notifications');
        const tableBody = document.getElementById('notifications-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';
            notifications.forEach(notification => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${notification.text || 'لا يوجد نص'}</td>
                    <td>${notification.date || 'غير محدد'}</td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            console.error('عنصر notifications-table-body غير موجود في Home.html');
        }
    }

    // عرض النافبار بناءً على نوع المستخدم
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    const navBar = document.getElementById('nav-bar');
    if (!navBar) {
        console.error('عنصر nav-bar غير موجود في Home.html! تأكد من وجود <nav id="nav-bar"> في الـ HTML.');
        showToast('خطأ: الناف بار غير موجود!', 'error');
        return;
    }
    if (loggedInUser) {
        const navItems = [
            { href: 'index.html', icon: 'fas fa-home', title: 'الرئيسية' },
            { href: 'Home.html', icon: 'fas fa-chart-line', title: 'النتائج' },
            { href: 'profile.html', icon: 'fas fa-user', title: 'الملف الشخصي' },
        { href: 'search-monthly.html', icon: 'fas fa-user', title: 'الملف الشخصي' },
            { href: 'exams.html', icon: 'fas fa-book', title: 'الاختبارات' }
            
        ];
        if (loggedInUser.type === 'admin') {
            navItems.push({ href: 'admin.html', icon: 'fas fa-cogs', title: 'لوحة التحكم' });
        }
        navBar.innerHTML = navItems.map(item => `
            <a href="${item.href}" title="${item.title}"><i class="${item.icon}"></i></a>
        `).join('');
        // التحقق من تحميل Font Awesome
        setTimeout(() => {
            const icon = document.querySelector('.nav-bar a i');
            if (!icon || getComputedStyle(icon).fontFamily.indexOf('Font Awesome') === -1) {
                console.error('Font Awesome icons not rendered');
                document.querySelectorAll('.nav-bar a i').forEach(icon => {
                    icon.style.fontFamily = '"Tajawal", sans-serif';
                    icon.style.fontSize = '0.7em';
                    icon.textContent = icon.getAttribute('title');
                });
                showToast('خطأ: فشل تحميل أيقونات الناف بار! يتم عرض النصوص بدلاً من ذلك.', 'error');
            } else {
                console.log('Font Awesome icons rendered successfully');
            }
        }, 2000);
    } else {
        navBar.innerHTML = `
            <a href="index.html" title="الرئيسية"><i class="fas fa-home"></i></a>
            <a href="Home.html" title="النتائج"><i class="fas fa-chart-line"></i></a>
        `;
    }

    // عرض لوحة التحكم مع الرسم البياني
    function renderDashboard() {
        const dashboard = document.getElementById('dashboard');
        if (dashboard && loggedInUser && loggedInUser.type === 'student') {
            dashboard.style.display = 'block';
            const student = students.find(s => s.username === loggedInUser.username);
            if (student) {
                const total = student.subjects.reduce((sum, s) => sum + (s.grade || 0), 0);
                const percentage = student.subjects.length ? (total / (student.subjects.length * 100)) * 100 : 0;
                const avgGrade = students.length ? students.reduce((sum, s) => {
                    const avg = s.subjects.length ? s.subjects.reduce((sSum, s) => sSum + (s.grade || 0), 0) / s.subjects.length : 0;
                    return sum + avg;
                }, 0) / students.length : 0;
                document.getElementById('student-percentage').textContent = `نسبة نجاحك: ${percentage.toFixed(1)}%`;
                document.getElementById('class-average').textContent = `متوسط الفصل: ${avgGrade.toFixed(1)}`;

                // إعداد الرسم البياني
                const ctx = document.getElementById('gradesChart').getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: student.subjects.map(s => s.name),
                        datasets: [{
                            label: 'درجات الطالب',
                            data: student.subjects.map(s => s.grade || 0),
                            backgroundColor: 'rgba(212, 175, 55, 0.6)',
                            borderColor: 'rgba(212, 175, 55, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
            } else {
                dashboard.style.display = 'none';
            }
        } else {
            dashboard.style.display = 'none';
        }
    }

    // التعامل مع نموذج البحث
    const searchForm = document.getElementById('search-form');
    const resultTableBody = document.getElementById('result-table-body');
    const violationsTableBody = document.getElementById('violations-table-body');
    if (searchForm) {
        searchForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const searchName = document.getElementById('search-name').value.trim();
            const searchId = document.getElementById('search-id').value.trim();
            if (!searchName || !searchId) {
                showToast('يرجى إدخال الاسم ورقم الجلوس معًا!', 'error');
                resultTableBody.innerHTML = `<tr><td colspan="4">يرجى إدخال الاسم ورقم الجلوس!</td></tr>`;
                violationsTableBody.innerHTML = `<tr><td colspan="5">يرجى إدخال الاسم ورقم الجلوس!</td></tr>`;
                return;
            }
            const student = students.find(s => 
                s.fullName.toLowerCase().includes(searchName.toLowerCase()) && 
                s.id === searchId
            );
            resultTableBody.innerHTML = '';
            violationsTableBody.innerHTML = '';
            if (student) {
                const total = student.subjects.reduce((sum, s) => sum + (s.grade || 0), 0);
                const percentage = student.subjects.length ? (total / (student.subjects.length * 100)) * 100 : 0;
                let percentageClass = percentage >= 85 ? 'high-percentage' : percentage >= 60 ? 'medium-percentage' : 'low-percentage';
                const labels = ['اسم الطالب', 'رقم الجلوس'].concat(student.subjects.map(s => s.name));
                const values = [student.fullName, student.id].concat(student.subjects.map(s => s.grade || 0));
                const labelsWithSeparators = labels.map((label, index) => 
                    index < labels.length - 1 ? `${label}<hr class="table-separator">` : label
                ).join('');
                const valuesWithSeparators = values.map((value, index) => 
                    index < values.length - 1 ? `${value}<hr class="table-separator">` : value
                ).join('');
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${labelsWithSeparators}</td>
                    <td>${valuesWithSeparators}</td>
                    <td>${total}</td>
                    <td class="${percentageClass}">${percentage.toFixed(1)}%</td>
                `;
                resultTableBody.appendChild(row);
                const studentViolations = violations.filter(v => v.studentId === student.id);
                if (studentViolations.length) {
                    studentViolations.forEach(violation => {
                        const violationRow = document.createElement('tr');
                        violationRow.innerHTML = `
                            <td>${violation.type === 'warning' ? 'إنذار' : 'مخالفة'}</td>
                            <td>${violation.reason}</td>
                            <td>${violation.penalty}</td>
                            <td>${violation.parentSummons ? 'نعم' : 'لا'}</td>
                            <td>${violation.date}</td>
                        `;
                        violationsTableBody.appendChild(violationRow);
                    });
                } else {
                    const violationRow = document.createElement('tr');
                    violationRow.innerHTML = `<td colspan="5">لا توجد إنذارات أو مخالفات لهذا الطالب.</td>`;
                    violationsTableBody.appendChild(violationRow);
                }
                showToast('تم العثور على النتيجة بنجاح!', 'success');
            } else {
                showToast('لم يتم العثور على الطالب! تأكد من الاسم ورقم الجلوس.', 'error');
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="4">لم يتم العثور على نتيجة! تأكد من الاسم ورقم الجلوس.</td>`;
                resultTableBody.appendChild(row);
                const violationRow = document.createElement('tr');
                violationRow.innerHTML = `<td colspan="5">لم يتم العثور على نتيجة!</td>`;
                violationsTableBody.appendChild(violationRow);
            }
        });
    }

    // عرض رسالة الترحيب
    function renderWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        
        if (welcomeMessage && loggedInUser) {
            const userName = loggedInUser.fullName || loggedInUser.username;
            let message;
            if (loggedInUser.type === 'admin') {
                message = `أهلًا بك يا بطل الإدارة، ${userName}! جاهز لقيادة العمليات؟ 🚀`;
            } else if (loggedInUser.type === 'student') {
                message = `مرحبًا بنجم الدراسة، ${userName}! استعد لتتألق في نتائجك! 🌟`;
            } else {
                message = `مرحبًا، ${userName}! نورتنا! 😊`;
            }
            welcomeMessage.textContent = message;
            showToast(message, 'success');
        } else if (welcomeMessage) {
            welcomeMessage.textContent = 'مرحبًا، ضيف! سجّل دخولك لتبدأ المغامرة! 🎉';
            showToast('يرجى تسجيل الدخول لتجربة كاملة!', 'info');
        }
    }

    // عرض رسائل Toast
    function showToast(message, type = 'success') {
        let backgroundColor, boxShadow;
        switch (type) {
            case 'success':
                backgroundColor = 'linear-gradient(135deg, #28a745, #218838)';
                boxShadow = '0 4px 15px rgba(40, 167, 69, 0.5)';
                break;
            case 'error':
                backgroundColor = 'linear-gradient(135deg, #dc3545, #c82333)';
                boxShadow = '0 4px 15px rgba(220, 53, 69, 0.5)';
                break;
            case 'info':
                backgroundColor = 'linear-gradient(135deg, #17a2b8, #117a8b)';
                boxShadow = '0 4px 15px rgba(23, 162, 184, 0.5)';
                break;
            default:
                backgroundColor = '#333';
                boxShadow = '0 4px 15px rgba(0, 0, 0, 0.5)';
        }
        Toastify({
            text: message,
            duration: 4000,
            gravity: 'top',
            position: 'right',
            backgroundColor: backgroundColor,
            stopOnFocus: true,
            style: {
                fontSize: '18px',
                fontFamily: '"Tajawal", sans-serif',
                padding: '20px 30px',
                borderRadius: '10px',
                direction: 'rtl',
                boxShadow: boxShadow,
                color: '#fff',
                maxWidth: '400px',
                textAlign: 'right',
            }
        }).showToast();
    }

    // استدعاء الدوال
    loadInitialData().then(() => {
        renderNotifications();
        renderWelcomeMessage();
        renderDashboard();
    });
});
