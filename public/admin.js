document.addEventListener('DOMContentLoaded', function () {
    // ────────────────────────────────────────────────
    // 1. دوال مساعدة عامة
    // ────────────────────────────────────────────────

    async function getFromServer(endpoint) {
        try {
            let cleanEndpoint = endpoint.split('/api/').pop() || endpoint;
            cleanEndpoint = cleanEndpoint.replace(/^\/+/, '');
            const response = await fetch(`/api/${cleanEndpoint}`);
            if (!response.ok) throw new Error(`خطأ ${response.status}`);
            const data = await response.json();
            console.log(`Data loaded from /api/${cleanEndpoint}:`, data.length, 'items');
            return data || [];
        } catch (error) {
            console.error(`Error fetching from ${endpoint}:`, error);
            showToast('خطأ في جلب البيانات من الخادم!', 'error');
            return [];
        }
    }

    async function saveToServer(endpoint, data, method = 'POST', id = null) {
        try {
            let cleanEndpoint = endpoint.split('/api/').pop() || endpoint;
            cleanEndpoint = cleanEndpoint.replace(/^\/+/, '');

            const url = id ? `/api/\( {cleanEndpoint}/ \){id}` : `/api/${cleanEndpoint}`;

            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            };

            const response = await fetch(url, options);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`خطأ ${response.status}: ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error saving to ${endpoint}:`, error);
            showToast(`خطأ في حفظ البيانات: ${error.message}`, 'error');
            throw error;
        }
    }

    function showToast(message, type = 'success') {
        let background;
        switch (type) {
            case 'success': background = 'linear-gradient(135deg, #28a745, #218838)'; break;
            case 'error':   background = 'linear-gradient(135deg, #dc3545, #c82333)'; break;
            case 'info':    background = 'linear-gradient(135deg, #17a2b8, #117a8b)'; break;
            default:        background = '#333';
        }

        Toastify({
            text: message,
            duration: 4000,
            gravity: 'top',
            position: 'right',
            style: {
                background,
                fontSize: '18px',
                fontFamily: '"Tajawal", "Arial", sans-serif',
                padding: '20px 30px',
                borderRadius: '10px',
                direction: 'rtl',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                color: '#fff',
                maxWidth: '400px',
                textAlign: 'right'
            },
            stopOnFocus: true
        }).showToast();
    }

    // ────────────────────────────────────────────────
    // 2. المتغيرات العامة
    // ────────────────────────────────────────────────

    let students      = [];
    let admins        = [];
    let notifications = [];
    let violations    = [];
    let years         = [];

    // ────────────────────────────────────────────────
    // 3. تحميل البيانات الأولية
    // ────────────────────────────────────────────────

    async function loadInitialData() {
        admins        = await getFromServer('/api/admins');
        students      = await getFromServer('/api/students');
        notifications = await getFromServer('/api/notifications');
        violations    = await getFromServer('/api/violations');
        years         = await getFromServer('/api/years');

        renderAdmins();
        renderResults();
        renderStats();
        renderNotifications();
        renderViolations();
        renderYears();
    }

    async function loadYears() {
        years = await getFromServer('/api/years');
        renderYears();
    }

    // ────────────────────────────────────────────────
    // 4. دوال الـ Rendering
    // ────────────────────────────────────────────────

    function renderAdminWelcomeMessage() {
        const welcomeMessage = document.querySelector('.admin-welcome-message');
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');

        if (welcomeMessage && loggedInUser.username) {
            const userName = loggedInUser.fullName || loggedInUser.username;
            const message = `أهلًا بك يا قائد الفريق، ${userName}! مستعد لإدارة المعهد بكفاءة؟ 🛠️`;
            welcomeMessage.textContent = message;
            showToast(message, 'success');
        } else if (welcomeMessage) {
            welcomeMessage.textContent = 'يرجى تسجيل الدخول كأدمن للوصول إلى لوحة التحكم! 🔐';
            showToast('يرجى تسجيل الدخول أولاً!', 'info');
        }
    }

    function renderAdmins() {
        const tableBody = document.getElementById('users-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';
            admins.forEach(admin => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${admin.fullName}</td>
                    <td>${admin.username}</td>
                    <td>
                        <button class="delete-btn" onclick="deleteAdmin('${admin.username}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    function renderResults(filter = '') {
        const tableBody = document.getElementById('results-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        const filteredStudents = students.filter(student =>
            (student.fullName || '').toLowerCase().includes(filter.toLowerCase()) ||
            (student.id || '').toLowerCase().includes(filter.toLowerCase())
        );

        filteredStudents.forEach(student => {
            const subjects = student.subjects || [];
            const subjectNames = subjects.map(s => s.name);
            const subjectGrades = subjects.map(s => s.grade || 0);

            const total = subjectGrades.reduce((sum, g) => sum + g, 0);
            const subjectCount = subjectGrades.length;
            const percentage = subjectCount > 0 ? (total / (subjectCount * 100)) * 100 : 0;

            let percentageClass = 'low-percentage';
            if (percentage >= 85) percentageClass = 'high-percentage';
            else if (percentage >= 60) percentageClass = 'medium-percentage';

            let labelsHTML = '<div>اسم الطالب</div><div>رقم الجلوس</div>';
            let valuesHTML = `<div>\( {student.fullName || 'غير متوفر'}</div><div> \){student.id || 'غير متوفر'}</div>`;

            subjects.forEach(sub => {
                labelsHTML += `<div>${sub.name}</div>`;
                valuesHTML += `<div>${sub.grade || 0}</div>`;
            });

            labelsHTML += '<div>السنة الدراسية</div><div>الترم</div>';
            valuesHTML += `<div>${student.year === 'first' ? 'الأولى' : 'الثانية'}</div>`;
            valuesHTML += `<div>${student.semester === 'first' ? 'الأول' : 'الثاني'}</div>`;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="text-align:right; padding:8px;">${labelsHTML}</td>
                <td style="text-align:right; padding:8px;">${valuesHTML}</td>
                <td>${total}</td>
                <td class="\( {percentageClass}"> \){percentage.toFixed(1)}%</td>
                <td>
                    <button class="edit-btn" onclick="editStudent('${student.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteStudent('${student.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function renderStats() {
        const statsSection = document.getElementById('stats-section');
        if (!statsSection) return;

        const totalStudents = students.length;
        const highestPercentage = students.length
            ? Math.max(...students.map(s => {
                const total = s.subjects.reduce((sum, sub) => sum + (sub.grade || 0), 0);
                return s.subjects.length ? (total / (s.subjects.length * 100)) * 100 : 0;
            }))
            : 0;

        const avgGrade = students.length
            ? students.reduce((sum, s) => {
                const avg = s.subjects.length
                    ? s.subjects.reduce((sSum, sub) => sSum + (sub.grade || 0), 0) / s.subjects.length
                    : 0;
                return sum + avg;
            }, 0) / students.length
            : 0;

        const passingStudents = students.filter(s => {
            const total = s.subjects.reduce((sum, sub) => sum + (sub.grade || 0), 0);
            return s.subjects.length ? (total / (s.subjects.length * 100)) * 100 >= 60 : false;
        }).length;

        const failingStudents = totalStudents - passingStudents;

        statsSection.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <p><i class="fas fa-users"></i> عدد الطلاب: ${totalStudents}</p>
                </div>
                <div class="stat-item">
                    <p><i class="fas fa-trophy"></i> أعلى نسبة: ${highestPercentage.toFixed(1)}%</p>
                </div>
                <div class="stat-item">
                    <p><i class="fas fa-chart-line"></i> متوسط الدرجات: ${avgGrade.toFixed(1)}</p>
                </div>
                <div class="stat-item">
                    <p><i class="fas fa-check-circle"></i> الناجحين: ${passingStudents}</p>
                </div>
                <div class="stat-item">
                    <p><i class="fas fa-times-circle"></i> الراسبين: ${failingStudents}</p>
                </div>
            </div>
        `;
    }

    function renderNotifications() {
        const tableBody = document.getElementById('notifications-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';
            notifications.forEach(notification => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${notification.text}</td>
                    <td>${notification.date}</td>
                    <td>
                        <button class="delete-btn" onclick="deleteNotification('${notification._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    function renderViolations() {
        const tableBody = document.getElementById('violations-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';
            violations.forEach(violation => {
                const student = students.find(s => s.id === violation.studentId);
                const studentName = student ? student.fullName : 'طالب غير موجود';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${violation.studentId}</td>
                    <td>${studentName}</td>
                    <td>${violation.type === 'warning' ? 'إنذار' : 'مخالفة'}</td>
                    <td>${violation.reason}</td>
                    <td>${violation.penalty}</td>
                    <td>${violation.parentSummons ? 'نعم' : 'لا'}</td>
                    <td>${violation.date}</td>
                    <td>
                        <button class="delete-btn" onclick="deleteViolation('${violation._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    function renderYears() {
        const tableBody = document.getElementById('years-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';
            years.forEach(y => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${y.name}</td>
                    <td>
                        \( {y.subjects.map(s => ` \){s.name} (${s.semester}, max: ${s.maxGrade})`).join('<br>')}
                    </td>
                    <td>
                        <button class="delete-btn" onclick="deleteYear('${y.name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    // ────────────────────────────────────────────────
    // 5. Event Listeners ودوال التحكم
    // ────────────────────────────────────────────────

    document.getElementById('add-user-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const fullName = document.getElementById('admin-name').value.trim();
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value.trim();

        if (!fullName || !username || !password) {
            showToast('يرجى إدخال الاسم الكامل، اسم المستخدم، وكلمة المرور!', 'error');
            return;
        }

        const response = await saveToServer('/api/admins', { fullName, username, password });
        if (response) {
            admins = await getFromServer('/api/admins');
            renderAdmins();
            showToast(`تم إضافة الأدمن بنجاح!\nاسم المستخدم: ${username}\nكلمة المرور: ${password}`, 'success');
            this.reset();
        } else {
            showToast('فشل إضافة الأدمن! تحقق من اسم المستخدم.', 'error');
        }
    });

    window.deleteAdmin = async function (username) {
        if (confirm('هل أنت متأكد من حذف هذا الأدمن؟')) {
            const response = await saveToServer(`/api/admins/${username}`, {}, 'DELETE');
            if (response) {
                admins = await getFromServer('/api/admins');
                renderAdmins();
                showToast('تم حذف الأدمن بنجاح.', 'success');
            } else {
                showToast('لا يمكن حذف آخر أدمن أو حدث خطأ!', 'error');
            }
        }
    };

    window.addNotification = async function () {
        const text = document.getElementById('notification-text')?.value.trim();
        if (!text) {
            showToast('يرجى إدخال نص الإشعار!', 'error');
            return;
        }
        const date = new Date().toLocaleString('ar-EG');
        const response = await saveToServer('/api/notifications', { text, date });
        if (response) {
            notifications = await getFromServer('/api/notifications');
            renderNotifications();
            showToast('تم إضافة الإشعار بنجاح!', 'success');
            document.getElementById('notification-text').value = '';
        }
    };

    window.deleteNotification = async function (id) {
        if (confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
            const response = await saveToServer(`/api/notifications/${id}`, {}, 'DELETE');
            if (response) {
                notifications = await getFromServer('/api/notifications');
                renderNotifications();
                showToast('تم حذف الإشعار بنجاح.', 'success');
            }
        }
    };

    window.deleteViolation = async function (id) {
        if (confirm('هل أنت متأكد من حذف هذا الإنذار/المخالفة؟')) {
            const response = await saveToServer(`/api/violations/${id}`, {}, 'DELETE');
            if (response) {
                violations = await getFromServer('/api/violations');
                renderViolations();
                showToast('تم حذف الإنذار/المخالفة بنجاح.', 'success');
            }
        }
    };

    window.deleteYear = async function (name) {
        if (confirm('هل أنت متأكد من حذف هذه السنة؟')) {
            const response = await saveToServer(`/api/years/${name}`, {}, 'DELETE');
            if (response) {
                await loadYears();
                showToast('تم حذف السنة بنجاح.', 'success');
            }
        }
    };

    window.addSubjectField = function () {
        const container = document.getElementById('subjects-container');
        if (!container) return;

        const div = document.createElement('div');
        div.className = 'input-group';
        div.innerHTML = `
            <label>اسم المادة</label>
            <input type="text" class="subject-name" required>
            <label>الترم</label>
            <select class="subject-semester">
                <option value="first_only">الترم الأول فقط</option>
                <option value="second_only">الترم الثاني فقط</option>
                <option value="both">الاثنين معًا</option>
            </select>
            <label>الدرجة النهائية</label>
            <input type="number" class="subject-max" min="1" required>
            <button type="button" onclick="this.parentNode.remove()">حذف</button>
        `;
        container.appendChild(div);
    };

    document.getElementById('add-year-form')?.addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('year-name')?.value.trim();
        const subjectFields = document.querySelectorAll('#subjects-container .input-group');

        const subjects = Array.from(subjectFields).map(group => ({
            name: group.querySelector('.subject-name').value.trim(),
            semester: group.querySelector('.subject-semester').value,
            maxGrade: parseInt(group.querySelector('.subject-max').value) || 100
        })).filter(s => s.name); // تجاهل الحقول الفارغة

        if (!name || subjects.length === 0) {
            showToast('يرجى إدخال اسم السنة ومادة واحدة على الأقل!', 'error');
            return;
        }

        const response = await saveToServer('/api/years', { name, subjects });
        if (response) {
            await loadYears();
            showToast('تم إضافة السنة بنجاح!', 'success');
            this.reset();
            document.getElementById('subjects-container').innerHTML = '';
        }
    });

    // ────────────────────────────────────────────────
    // 6. الاستدعاءات النهائية
    // ────────────────────────────────────────────────

    renderAdminWelcomeMessage();
    loadInitialData();
    loadYears(); // تحميل السنوات أيضًا
});