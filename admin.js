document.addEventListener('DOMContentLoaded', function() {
    async function getFromServer(endpoint) {
        try {
            const cleanEndpoint = endpoint.replace(/^\/+/, ''); // إزالة / الإضافي لتجنب //api/admins
            const response = await fetch(`https://school-system-aldabeia-production-31f7.up.railway.app/${cleanEndpoint}`);
            if (!response.ok) throw new Error(`خطأ ${response.status}`);
            const data = await response.json();
            console.log(`Data loaded from server for ${cleanEndpoint}:`, data.length || data, 'items');
            return data || [];
        } catch (error) {
            console.error(`Error fetching from ${cleanEndpoint}:`, error);
            showToast('خطأ في جلب البيانات من الخادم!', 'error');
            return [];
        }
    }

    async function saveToServer(endpoint, data, method = 'POST', id = null) {
        try {
            const cleanEndpoint = endpoint.replace(/^\/+/, '');
            const url = id ? `https://school-system-aldabeia-production-31f7.up.railway.app/${cleanEndpoint}/${id}` : `https://school-system-aldabeia-production-31f7.up.railway.app/${cleanEndpoint}`;
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            };
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`خطأ ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Error saving to ${cleanEndpoint}:`, error);
            showToast('خطأ في حفظ البيانات!', 'error');
            return null;
        }
    }

    function renderAdminWelcomeMessage() {
        const welcomeMessage = document.querySelector('.admin-welcome-message');
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
        if (welcomeMessage && loggedInUser.username) {
            const userName = loggedInUser.fullName || loggedInUser.username;
            let message = `أهلًا بك يا قائد الفريق، ${userName}! مستعد لإدارة المعهد بكفاءة؟ 🛠️`;
            welcomeMessage.textContent = message;
            showToast(message, 'success');
        } else if (welcomeMessage) {
            welcomeMessage.textContent = 'يرجى تسجيل الدخول كأدمن للوصول إلى لوحة التحكم! 🔐';
            showToast('يرجى تسجيل الدخول أولاً!', 'info');
        }
    }

    function showToast(message, type = 'success') {
        let background, boxShadow;
        switch (type) {
            case 'success':
                background = 'linear-gradient(135deg, #28a745, #218838)';
                boxShadow = '0 4px 15px rgba(40, 167, 69, 0.5)';
                break;
            case 'error':
                background = 'linear-gradient(135deg, #dc3545, #c82333)';
                boxShadow = '0 4px 15px rgba(220, 53, 69, 0.5)';
                break;
            case 'info':
                background = 'linear-gradient(135deg, #17a2b8, #117a8b)';
                boxShadow = '0 4px 15px rgba(23, 162, 184, 0.5)';
                break;
            default:
                background = '#333';
                boxShadow = '0 4px 15px rgba(0, 0, 0, 0.5)';
        }
        Toastify({
            text: message,
            duration: 4000,
            gravity: 'top',
            position: 'right',
            stopOnFocus: true,
            style: {
                fontSize: '18px',
                fontFamily: '"Tajawal", "Arial", sans-serif',
                padding: '20px 30px',
                borderRadius: '10px',
                direction: 'rtl',
                boxShadow: boxShadow,
                color: '#fff',
                maxWidth: '400px',
                textAlign: 'right',
                background: background // استبدال backgroundColor بـ style.background
            }
        }).showToast();
    }

    let students = [];
    let admins = [];
    let notifications = [];
    let violations = [];

    async function loadInitialData() {
        admins = await getFromServer('/api/admins');
        students = await getFromServer('/api/students');
        notifications = await getFromServer('/api/notifications');
        violations = await getFromServer('/api/violations');
        renderAdmins();
        renderResults();
        renderStats();
        renderNotifications();
        renderViolations();
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
                        <button class="delete-btn" onclick="deleteAdmin('${admin.username}')">حذف</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    function renderResults() {
        const tableBody = document.getElementById('results-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';
            students.forEach(student => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.fullName}</td>
                    <td>${student.id}</td>
                    <td>${student.subjects.map(s => `${s.name}: ${s.grade}`).join('<br>')}</td>
                    <td>
                        <button class="edit-btn" onclick="editStudent('${student.id}')">تعديل</button>
                        <button class="delete-btn" onclick="deleteStudent('${student.id}')">حذف</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    function renderStats() {
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <p>عدد الطلاب: ${students.length}</p>
                <p>عدد الأدمنز: ${admins.length}</p>
                <p>عدد المخالفات: ${violations.length}</p>
                <p>عدد الإشعارات: ${notifications.length}</p>
            `;
        }
    }

    function renderNotifications() {
        const notificationsContainer = document.getElementById('notifications-container');
        if (notificationsContainer) {
            notificationsContainer.innerHTML = '';
            notifications.forEach(notification => {
                const div = document.createElement('div');
                div.className = 'notification';
                div.innerHTML = `
                    <p>${notification.text} - ${notification.date}</p>
                    <button class="delete-btn" onclick="deleteNotification('${notification._id}')">حذف</button>
                `;
                notificationsContainer.appendChild(div);
            });
        }
    }

    function renderViolations() {
        const violationsContainer = document.getElementById('violations-table-body');
        if (violationsContainer) {
            violationsContainer.innerHTML = '';
            violations.forEach(violation => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${violation.studentId}</td>
                    <td>${violation.type}</td>
                    <td>${violation.reason}</td>
                    <td>${violation.penalty}</td>
                    <td>${violation.parentSummons ? 'نعم' : 'لا'}</td>
                    <td>${violation.date}</td>
                    <td>
                        <button class="delete-btn" onclick="deleteViolation('${violation._id}')">حذف</button>
                    </td>
                `;
                violationsContainer.appendChild(row);
            });
        }
    }

    window.deleteAdmin = async function(username) {
        if (confirm('هل أنت متأكد؟ لن تتمكن من استرجاع بيانات هذا الأدمن!')) {
            const response = await saveToServer('/api/admins', {}, 'DELETE', username);
            if (response) {
                admins = await getFromServer('/api/admins');
                renderAdmins();
                renderStats();
                showToast('تم حذف الأدمن بنجاح.', 'success');
            }
        }
    };

    window.deleteNotification = async function(id) {
        if (confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
            const response = await saveToServer('/api/notifications', {}, 'DELETE', id);
            if (response) {
                notifications = await getFromServer('/api/notifications');
                renderNotifications();
                renderStats();
                showToast('تم حذف الإشعار بنجاح.', 'success');
            }
        }
    };

    window.deleteViolation = async function(id) {
        if (confirm('هل أنت متأكد من حذف هذه المخالفة؟')) {
            const response = await saveToServer('/api/violations', {}, 'DELETE', id);
            if (response) {
                violations = await getFromServer('/api/violations');
                renderViolations();
                renderStats();
                showToast('تم حذف المخالفة بنجاح.', 'success');
            }
        }
    };

    const addStudentForm = document.getElementById('add-student-form');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const fullName = document.getElementById('student-name').value;
            const studentId = document.getElementById('student-id').value;
            const subject1 = parseInt(document.getElementById('subject1').value) || 0;
            const subject2 = parseInt(document.getElementById('subject2').value) || 0;
            const subject3 = parseInt(document.getElementById('subject3').value) || 0;
            const subject4 = parseInt(document.getElementById('subject4').value) || 0;
            const subject5 = parseInt(document.getElementById('subject5').value) || 0;
            const subject6 = parseInt(document.getElementById('subject6').value) || 0;
            const subject7 = parseInt(document.getElementById('subject7').value) || 0;
            const subject8 = parseInt(document.getElementById('subject8').value) || 0;

            if (!fullName || !studentId) {
                showToast('يرجى إدخال اسم الطالب ورقم الجلوس!', 'error');
                return;
            }
            if ([subject1, subject2, subject3, subject4, subject5, subject6, subject7, subject8].some(g => g < 0 || g > 100)) {
                showToast('تأكد أن جميع الدرجات بين 0 و100!', 'error');
                return;
            }

            const subjects = [
                { name: "مبادئ وأسس تمريض", grade: subject1 },
                { name: "اللغة العربية", grade: subject2 },
                { name: "اللغة الإنجليزية", grade: subject3 },
                { name: "الفيزياء", grade: subject4 },
                { name: "الكيمياء", grade: subject5 },
                { name: "التشريح / علم وظائف الأعضاء", grade: subject6 },
                { name: "التربية الدينية", grade: subject7 },
                { name: "الكمبيوتر", grade: subject8 }
            ];

            const existingStudent = students.find(s => s.id === studentId);
            if (existingStudent) {
                const response = await saveToServer(`/api/students/${studentId}`, { subjects }, 'PUT');
                if (response) {
                    students = await getFromServer('/api/students');
                    renderResults();
                    renderStats();
                    showToast(`تم تحديث درجات الطالب ${fullName} بنجاح!`, 'success');
                    this.reset();
                }
            } else {
                const response = await saveToServer('/api/students', { fullName, id: studentId, subjects });
                if (response) {
                    students = await getFromServer('/api/students');
                    renderResults();
                    renderStats();
                    showToast(`تم إضافة الطالب بنجاح!\nاسم المستخدم: ${response.student.username}\nكلمة المرور: ${response.student.originalPassword}`, 'success');
                    this.reset();
                }
            }
        });
    }

    window.deleteStudent = async function(studentId) {
        if (confirm('هل أنت متأكد؟ لن تتمكن من استرجاع بيانات هذا الطالب!')) {
            const response = await saveToServer(`/api/students/${studentId}`, {}, 'DELETE');
            if (response) {
                students = await getFromServer('/api/students');
                violations = await getFromServer('/api/violations');
                renderResults();
                renderStats();
                renderViolations();
                showToast('تم حذف الطالب بنجاح.', 'success');
            }
        }
    };

    window.editStudent = function(studentId) {
        const student = students.find(s => s.id === studentId);
        if (student) {
            document.getElementById('student-name').value = student.fullName;
            document.getElementById('student-id').value = student.id;
            document.getElementById('subject1').value = student.subjects[0]?.grade || 0;
            document.getElementById('subject2').value = student.subjects[1]?.grade || 0;
            document.getElementById('subject3').value = student.subjects[2]?.grade || 0;
            document.getElementById('subject4').value = student.subjects[3]?.grade || 0;
            document.getElementById('subject5').value = student.subjects[4]?.grade || 0;
            document.getElementById('subject6').value = student.subjects[5]?.grade || 0;
            document.getElementById('subject7').value = student.subjects[6]?.grade || 0;
            document.getElementById('subject8').value = student.subjects[7]?.grade || 0;
        }
    };

    window.scrollToTop = function() {
        document.querySelector('.admin-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.scrollToBottom = function() {
        const container = document.querySelector('.admin-container');
        if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
    };

    loadInitialData();
    renderAdminWelcomeMessage();
});
