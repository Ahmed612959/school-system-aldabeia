document.addEventListener('DOMContentLoaded', function() {
    async function getFromServer(endpoint) {
        try {
            const response = await fetch(`http://localhost:3000${endpoint}`);
            if (!response.ok) throw new Error(`خطأ ${response.status}`);
            const data = await response.json();
            console.log(`Data loaded from server for ${endpoint}:`, data.length, 'items');
            return data || [];
        } catch (error) {
            console.error(`Error fetching from ${endpoint}:`, error);
            showToast('خطأ في جلب البيانات من الخادم!', 'error');
            return [];
        }
    }

    async function saveToServer(endpoint, data, method = 'POST', id = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            };
            const response = await fetch(`http://localhost:3000${endpoint}${id ? `/${id}` : ''}`, options);
            if (!response.ok) throw new Error(`خطأ ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Error saving to ${endpoint}:`, error);
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
                fontFamily: '"Tajawal", "Arial", sans-serif',
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
                        <button class="delete-btn" onclick="deleteAdmin('${admin.username}')"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    document.getElementById('add-user-form')?.addEventListener('submit', async function(e) {
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

    window.deleteAdmin = async function(username) {
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

    function renderResults(filter = '') {
        const tableBody = document.getElementById('results-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';
            const filteredStudents = students.filter(student => 
                student.fullName.toLowerCase().includes(filter.toLowerCase()) ||
                student.id.toLowerCase().includes(filter.toLowerCase())
            );
            filteredStudents.forEach(student => {
                const total = student.subjects.reduce((sum, s) => sum + (s.grade || 0), 0);
                const percentage = student.subjects.length ? (total / (student.subjects.length * 100)) * 100 : 0;
                let percentageClass = '';
                if (percentage >= 85) percentageClass = 'high-percentage';
                else if (percentage >= 60) percentageClass = 'medium-percentage';
                else percentageClass = 'low-percentage';

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
                    <td>
                        <button class="edit-btn" onclick="editStudent('${student.id}')"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn" onclick="deleteStudent('${student.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    document.getElementById('search-input')?.addEventListener('input', function() {
        const searchTerm = this.value.trim();
        renderResults(searchTerm);
    });

    function renderStats() {
        const statsSection = document.getElementById('stats-section');
        if (statsSection) {
            const totalStudents = students.length;
            const highestPercentage = students.length ? Math.max(...students.map(s => {
                const total = s.subjects.reduce((sum, s) => sum + (s.grade || 0), 0);
                return s.subjects.length ? (total / (s.subjects.length * 100)) * 100 : 0;
            })) : 0;
            const avgGrade = students.length ? students.reduce((sum, s) => {
                const avg = s.subjects.length ? s.subjects.reduce((sSum, s) => sSum + (s.grade || 0), 0) / s.subjects.length : 0;
                return sum + avg;
            }, 0) / students.length : 0;

            const passingStudents = students.filter(s => {
                const total = s.subjects.reduce((sum, s) => sum + (s.grade || 0), 0);
                return s.subjects.length ? (total / (s.subjects.length * 100)) * 100 >= 60 : false;
            }).length;
            const failingStudents = totalStudents - passingStudents;

            const subjects = [
                "مبادئ وأسس تمريض", "اللغة العربية", "اللغة الإنجليزية", "الفيزياء",
                "الكيمياء", "التشريح / علم وظائف الأعضاء", "التربية الدينية", "الكمبيوتر"
            ];
            const highestGrades = subjects.map(subject => {
                const maxGrade = students.length ? Math.max(...students.map(s => {
                    const subj = s.subjects.find(sub => sub.name === subject);
                    return subj ? (subj.grade || 0) : 0;
                })) : 0;
                return { subject, maxGrade };
            });

            statsSection.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item" id="total-students">
                        <p><i class="fas fa-users"></i> عدد الطلاب: ${totalStudents}</p>
                    </div>
                    <div class="stat-item" id="highest-grade">
                        <p><i class="fas fa-trophy"></i> أعلى نسبة مئوية: ${highestPercentage.toFixed(1)}%</p>
                    </div>
                    <div class="stat-item" id="average-grade">
                        <p><i class="fas fa-chart-line"></i> متوسط الدرجات: ${avgGrade.toFixed(1)}</p>
                    </div>
                    <div class="stat-item" id="passing-students">
                        <p><i class="fas fa-check-circle"></i> عدد الناجحين: ${passingStudents}</p>
                    </div>
                    <div class="stat-item" id="failing-students">
                        <p><i class="fas fa-times-circle"></i> عدد الراسبين: ${failingStudents}</p>
                    </div>
                    ${highestGrades.map(item => `
                        <div class="stat-item">
                            <p><i class="fas fa-star"></i> أعلى درجة في ${item.subject}: ${item.maxGrade}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    function renderNotifications() {
        const tableBody = document.getElementById('notifications-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';
            notifications.forEach((notification, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${notification.text}</td>
                    <td>${notification.date}</td>
                    <td>
                        <button class="delete-btn" onclick="deleteNotification('${notification._id}')"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    window.addNotification = async function() {
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

    window.deleteNotification = async function(id) {
        if (confirm('هل أنت متأكد من حذف هذا الإشعار؟')) {
            const response = await saveToServer(`/api/notifications/${id}`, {}, 'DELETE');
            if (response) {
                notifications = await getFromServer('/api/notifications');
                renderNotifications();
                showToast('تم حذف الإشعار بنجاح.', 'success');
            }
        }
    };

    function renderViolations() {
        const tableBody = document.getElementById('violations-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';
            violations.forEach((violation, index) => {
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
                        <button class="delete-btn" onclick="deleteViolation('${violation._id}')"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    document.getElementById('add-violation-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const studentId = document.getElementById('violation-student-id').value.trim();
        const type = document.getElementById('violation-type').value;
        const reason = document.getElementById('violation-reason').value.trim();
        const penalty = document.getElementById('violation-penalty').value.trim();
        const parentSummons = document.getElementById('parent-summons').checked;

        if (!studentId || !reason || !penalty) {
            showToast('يرجى إدخال جميع الحقول المطلوبة!', 'error');
            return;
        }

        if (!students.some(s => s.id === studentId)) {
            showToast('رقم الجلوس غير موجود! يرجى التأكد من رقم الجلوس.', 'error');
            return;
        }

        const date = new Date().toLocaleString('ar-EG');
        const response = await saveToServer('/api/violations', { studentId, type, reason, penalty, parentSummons, date });
        if (response) {
            violations = await getFromServer('/api/violations');
            renderViolations();
            showToast(`تم إضافة ${type === 'warning' ? 'إنذار' : 'مخالفة'} بنجاح!`, 'success');
            this.reset();
        }
    });

    window.deleteViolation = async function(id) {
        if (confirm('هل أنت متأكد من حذف هذا الإنذار/المخالفة؟')) {
            const response = await saveToServer(`/api/violations/${id}`, {}, 'DELETE');
            if (response) {
                violations = await getFromServer('/api/violations');
                renderViolations();
                showToast('تم حذف الإنذار/المخالفة بنجاح.', 'success');
            }
        }
    };

    window.processText = async function() {
        const textInput = document.getElementById('text-input')?.value.trim();
        if (!textInput) {
            showToast('يرجى إلصق النص أولاً!', 'error');
            return;
        }
        const lines = textInput.split('\n').filter(line => line.trim() !== '');
        let addedCount = 0;
        let updatedCount = 0;
        for (const line of lines) {
            const parts = line.split('|').map(part => part.trim());
            if (parts.length === 10) {
                const fullName = parts[0];
                const studentId = parts[1];
                const subjects = [
                    { name: "مبادئ وأسس تمريض", grade: parseInt(parts[2]) || 0 },
                    { name: "اللغة العربية", grade: parseInt(parts[3]) || 0 },
                    { name: "اللغة الإنجليزية", grade: parseInt(parts[4]) || 0 },
                    { name: "الفيزياء", grade: parseInt(parts[5]) || 0 },
                    { name: "الكيمياء", grade: parseInt(parts[6]) || 0 },
                    { name: "التشريح / علم وظائف الأعضاء", grade: parseInt(parts[7]) || 0 },
                    { name: "التربية الدينية", grade: parseInt(parts[8]) || 0 },
                    { name: "الكمبيوتر", grade: parseInt(parts[9]) || 0 }
                ];

                const existingStudent = students.find(s => s.id === studentId);
                if (existingStudent) {
                    const response = await saveToServer(`/api/students/${studentId}`, { subjects }, 'PUT');
                    if (response) updatedCount++;
                } else {
                    const response = await saveToServer('/api/students', { fullName, id: studentId, subjects });
                    if (response) addedCount++;
                }
            }
        }
        students = await getFromServer('/api/students');
        renderResults();
        renderStats();
        showToast(`تم تحليل النص وإضافة ${addedCount} طالب جديد وتحديث ${updatedCount} طالب بنجاح!`, 'success');
        document.getElementById('text-input').value = '';
    };

    window.analyzePDF = async function() {
        const fileInput = document.getElementById('pdf-upload');
        const file = fileInput.files[0];
        if (!file) {
            showToast('يرجى اختيار ملف PDF أولاً!', 'error');
            return;
        }
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const pdfData = arrayBufferToBase64(this.result);
            const response = await saveToServer('/api/analyze-pdf', { pdfData });
            if (response && response.results) {
                displayPDFResults(response.results);
                students = await getFromServer('/api/students');
                renderResults();
                renderStats();
                showToast(`تم تحليل الملف وإضافة/تحديث ${response.results.length} طالب بنجاح!`, 'success');
            } else {
                showToast('خطأ في تحليل الملف!', 'error');
            }
        };
        fileReader.readAsArrayBuffer(file);
    };

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function displayPDFResults(results) {
        const resultsDisplay = document.getElementById('results-display');
        resultsDisplay.innerHTML = '';
        const table = document.createElement('table');
        table.className = 'results-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>البيانات</th>
                    <th>القيم</th>
                    <th>المجموع</th>
                    <th>النسبة</th>
                    <th>الإجراء</th>
                </tr>
            </thead>
            <tbody id="pdf-results-body"></tbody>
        `;
        const tbody = table.querySelector('tbody');
        results.forEach(student => {
            const total = Object.values(student.results).reduce((sum, grade) => sum + grade, 0);
            const percentage = student.results.length ? (total / (Object.keys(student.results).length * 100)) * 100 : 0;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>اسم: ${student.name}<br>رقم الجلوس: ${student.id}</td>
                <td>${Object.entries(student.results).map(([sub, grade]) => `${sub}: ${grade}`).join('<br>')}</td>
                <td>${total}</td>
                <td class="${percentage >= 85 ? 'high-percentage' : percentage >= 60 ? 'medium-percentage' : 'low-percentage'}">${percentage.toFixed(1)}%</td>
                <td>
                    <button class="edit-btn" onclick="editStudent('${student.id}')"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="deleteStudent('${student.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
        resultsDisplay.appendChild(table);
    }

    document.getElementById('analyze-pdf')?.addEventListener('click', analyzePDF);

    document.getElementById('add-result-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const fullName = document.getElementById('student-name').value.trim();
        const studentId = document.getElementById('student-id').value.trim();
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