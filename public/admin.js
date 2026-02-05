document.addEventListener('DOMContentLoaded', function() {
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
        // الحل السحري والأخير: نشيل كل حاجة قبل آخر /api/
        let cleanEndpoint = endpoint.split('/api/').pop() || endpoint;
        cleanEndpoint = cleanEndpoint.replace(/^\/+/, ''); // نشيل أي / من البداية

        const url = id 
            ? `/api/${cleanEndpoint}/${id}` 
            : `/api/${cleanEndpoint}`;

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
        let background;
        switch (type) {
            case 'success':
                background = 'linear-gradient(135deg, #28a745, #218838)';
                break;
            case 'error':
                background = 'linear-gradient(135deg, #dc3545, #c82333)';
                break;
            case 'info':
                background = 'linear-gradient(135deg, #17a2b8, #117a8b)';
                break;
            default:
                background = '#333';
        }
        Toastify({
            text: message,
            duration: 4000,
            gravity: 'top',
            position: 'right',
            style: {
                background: background,
                fontSize: '18px',
                fontFamily: '"Tajawal", "Arial", sans-serif',
                padding: '20px 30px',
                borderRadius: '10px',
                direction: 'rtl',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)',
                color: '#fff',
                maxWidth: '400px',
                textAlign: 'right',
            },
            stopOnFocus: true,
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


function displayPDFResults(results) {
    console.log('نتائج الـ PDF المستلمة:', results); // تسجيل النتائج الواردة
    const resultsDisplay = document.getElementById('results-display');
    if (!resultsDisplay) {
        console.error('عنصر results-display غير موجود في DOM');
        return;
    }
    resultsDisplay.innerHTML = ''; // مسح المحتوى السابق

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
    const tbody = table.querySelector('#pdf-results-body');

    // قائمة المواد المتوقعة
    const validSubjects = [
        'مبادئ وأسس تمريض',
        'اللغة العربية',
        'اللغة الإنجليزية',
        'الفيزياء',
        'الكيمياء',
        'التشريح/علم وظائف الأعضاء',
        'التربية الدينية',
        'الكمبيوتر'
    ];

    results.forEach(student => {
        // حساب المجموع
        const grades = Object.values(student.results);
        const total = grades.reduce((sum, grade) => sum + (parseInt(grade) || 0), 0);
        // حساب النسبة بناءً على عدد المواد المتوقعة (8)
        const percentage = (total / (validSubjects.length * 100)) * 100;
        console.log(`طالب: ${student.name}, المجموع: ${total}, النسبة: ${percentage.toFixed(1)}%`); // تسجيل الحسابات

        // تحديد فئة النسبة للتنسيق
        let percentageClass = '';
        if (percentage >= 85) percentageClass = 'high-percentage';
        else if (percentage >= 60) percentageClass = 'medium-percentage';
        else percentageClass = 'low-percentage';

        // إنشاء صف الجدول
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>اسم: ${student.name}<br>رقم الجلوس: ${student.id}</td>
            <td>${Object.entries(student.results).map(([sub, grade]) => `${sub}: ${grade}`).join('<br>')}</td>
            <td>${total}</td>
            <td class="${percentageClass}">${percentage.toFixed(1)}%</td>
            <td>
                <button class="edit-btn" onclick="editStudent('${student.id}')"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" onclick="deleteStudent('${student.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });

    resultsDisplay.appendChild(table);
    console.log('تم إنشاء الجدول وعرضه في results-display');
}

    window.analyzePDF = async function() {
        console.log('تم النقر على زر تحليل الملف');
        const fileInput = document.getElementById('pdf-upload');
        if (!fileInput) {
            console.error('عنصر pdf-upload غير موجود في DOM');
            showToast('خطأ: عنصر إدخال الملف غير موجود!', 'error');
            return;
        }
        const file = fileInput.files[0];
        if (!file || file.type !== 'application/pdf') {
            console.error('لم يتم اختيار ملف PDF صالح:', file);
            showToast('يرجى اختيار ملف PDF صالح!', 'error');
            return;
        }
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            try {
                console.log('بدء قراءة ملف PDF');
                const base64String = fileReader.result.split(',')[1]; // استخراج Base64
                console.log('Base64 المرسل:', base64String.substring(0, 50) + '...');
                const response = await saveToServer('/api/analyze-pdf', { pdfData: base64String });
                if (response && response.results) {
                    displayPDFResults(response.results);
                    students = await getFromServer('/api/students');
                    renderResults();
                    renderStats();
                    showToast(`تم تحليل الملف وإضافة/تحديث ${response.results.length} طالب بنجاح!`, 'success');
                } else {
                    console.error('لا توجد نتائج في استجابة الخادم:', response);
                    showToast('خطأ في تحليل الملف: لا توجد نتائج!', 'error');
                }
            } catch (error) {
                console.error('خطأ في تحليل PDF:', error);
                showToast(`خطأ في تحليل الملف: ${error.message}`, 'error');
            }
        };
        fileReader.onerror = function(error) {
            console.error('خطأ في قراءة الملف:', error);
            showToast('خطأ في قراءة الملف!', 'error');
        };
        fileReader.readAsDataURL(file);
    };

    document.getElementById('analyze-pdf')?.addEventListener('click', () => {
        console.log('ربط معالج الحدث لزر analyze-pdf');
        window.analyzePDF();
    });

    document.getElementById('add-result-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const fullName = document.getElementById('student-name').value.trim();
    const studentId = document.getElementById('student-id').value.trim();
    const semester = document.getElementById('semester').value;
    const subject1 = parseInt(document.getElementById('subject1').value) || 0;
    const subject2 = parseInt(document.getElementById('subject2').value) || 0;
    const subject3 = parseInt(document.getElementById('subject3').value) || 0;
    const subject4 = parseInt(document.getElementById('subject4').value) || 0;
    const subject5 = parseInt(document.getElementById('subject5').value) || 0;
    const subject6 = parseInt(document.getElementById('subject6').value) || 0;
    const subject7 = parseInt(document.getElementById('subject7').value) || 0;
    const subject8 = parseInt(document.getElementById('subject8').value) || 0;
    const subject9 = parseInt(document.getElementById('subject9').value) || 0;
    const subject10 = parseInt(document.getElementById('subject10').value) || 0;

    if (!fullName || !studentId) {
        showToast('يرجى إدخال اسم الطالب ورقم الجلوس!', 'error');
        return;
    }

    if ([subject1, subject2, subject3, subject4, subject5, subject6, subject7, subject8, subject9, subject10].some(g => g < 0 || g > 100)) {
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

    if (semester === 'first') {
        if (subject9 > 0) { // إضافة التاريخ فقط إذا كانت الدرجة أكبر من 0
            subjects.push({ name: "التاريخ", grade: subject9 });
        }
    } else {
        if (subject10 > 0) { // إضافة الجغرافيا فقط إذا كانت الدرجة أكبر من 0
            subjects.push({ name: "الجغرافيا", grade: subject10 });
        }
    }

    console.log('البيانات المرسلة:', { fullName, studentId, semester, subjects }); // تسجيل البيانات

    const existingStudent = students.find(s => s.id === studentId);
    if (existingStudent) {
        const response = await saveToServer(`/api/students/${studentId}`, { subjects, semester }, 'PUT');
        if (response) {
            students = await getFromServer('/api/students');
            console.log('البيانات المحدثة من الخادم:', students.find(s => s.id === studentId)); // تسجيل بيانات الطالب المحدثة
            renderResults();
            renderStats();
            showToast(`تم تحديث درجات الطالب ${fullName} بنجاح!`, 'success');
            this.reset();
            toggleSubjects();
        }
    } else {
        const response = await saveToServer('/api/students', { fullName, id: studentId, subjects, semester });
        if (response) {
            students = await getFromServer('/api/students');
            console.log('بيانات الطالب الجديد:', response); // تسجيل بيانات الطالب الجديد
            renderResults();
            renderStats();
            showToast(`تم إضافة الطالب بنجاح!\nاسم المستخدم: ${response.student.username}\nكلمة المرور: ${response.student.originalPassword}`, 'success');
            this.reset();
            toggleSubjects();
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
    window.toggleSubjects = function() {
    const semester = document.getElementById('semester').value;
    const historyGroup = document.getElementById('history-group');
    const geographyGroup = document.getElementById('geography-group');

    if (semester === 'first') {
        historyGroup.style.display = 'block';
        geographyGroup.style.display = 'none';
        document.getElementById('subject10').value = ''; // إعادة تعيين درجة الجغرافيا
    } else {
        historyGroup.style.display = 'none';
        geographyGroup.style.display = 'block';
        document.getElementById('subject9').value = ''; // إعادة تعيين درجة التاريخ
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

 // دالة للتحقق من توفر كود الاختبار
async function checkExamCodeAvailability(code) {
    try {
        const response = await fetch('/api/exams/check-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await response.json();
        return data.available;
    } catch (error) {
        console.error('Error checking exam code:', error);
        showToast('فشل التحقق من كود الاختبار!', 'error');
        return false;
    }
}


// دالة لإنشاء واجهة إدخال الأسئلة بناءً على نوع السؤال
function renderQuestionInputs() {
    const type = document.getElementById('question-type').value;
    const inputsDiv = document.getElementById('question-inputs');
    inputsDiv.innerHTML = '';

    if (type === 'multiple') {
        inputsDiv.innerHTML = `
            <div class="input-group">
                <label for="question-text">نص السؤال <span class="required">*</span></label>
                <input type="text" id="question-text" placeholder="أدخل نص السؤال" required>
            </div>
            <div class="input-group">
                <label>الخيارات (اختر الإجابة الصحيحة بعلامة الصح)</label>
                <div class="options-container">
                    <div><input type="text" class="option-input" placeholder="الخيار 1"><i class="fas fa-check correct-option"></i></div>
                    <div><input type="text" class="option-input" placeholder="الخيار 2"><i class="fas fa-check correct-option"></i></div>
                    <div><input type="text" class="option-input" placeholder="الخيار 3"><i class="fas fa-check correct-option"></i></div>
                    <div><input type="text" class="option-input" placeholder="الخيار 4"><i class="fas fa-check correct-option"></i></div>
                </div>
            </div>
        `;
    } else if (type === 'essay') {
        inputsDiv.innerHTML = `
            <div class="input-group">
                <label for="question-text">نص السؤال <span class="required">*</span></label>
                <input type="text" id="question-text" placeholder="أدخل نص السؤال" required>
            </div>
            <div class="input-group">
                <label for="answer-text">الإجابة النموذجية <span class="required">*</span></label>
                <textarea id="answer-text" rows="4" placeholder="أدخل الإجابة النموذجية"></textarea>
            </div>
        `;
    } else if (type === 'list') {
        inputsDiv.innerHTML = `
            <div class="input-group">
                <label for="question-text">نص السؤال <span class="required">*</span></label>
                <input type="text" id="question-text" placeholder="أدخل نص السؤال" required>
            </div>
            <div class="input-group">
                <label>الإجابات (مرقمة من 1 إلى 5)</label>
                <div class="list-container">
                    <div><span>1.</span><input type="text" class="list-input" placeholder="الإجابة 1"></div>
                    <div><span>2.</span><input type="text" class="list-input" placeholder="الإجابة 2"></div>
                    <div><span>3.</span><input type="text" class="list-input" placeholder="الإجابة 3"></div>
                    <div><span>4.</span><input type="text" class="list-input" placeholder="الإجابة 4"></div>
                    <div><span>5.</span><input type="text" class="list-input" placeholder="الإجابة 5"></div>
                </div>
            </div>
        `;
    } else if (type === 'truefalse') {
        inputsDiv.innerHTML = `
            <div class="input-group">
                <label for="question-text">نص السؤال <span class="required">*</span></label>
                <input type="text" id="question-text" placeholder="أدخل نص السؤال" required>
            </div>
            <div class="input-group">
                <label>الإجابة</label>
                <select id="truefalse-answer">
                    <option value="true">صح</option>
                    <option value="false">خطأ</option>
                </select>
            </div>
        `;
    }

    // إدارة اختيار الإجابة الصحيحة للأسئلة الاختيارية
    document.querySelectorAll('.correct-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.correct-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

// تحديث واجهة إدخال الأسئلة عند تغيير نوع السؤال
document.getElementById('question-type').addEventListener('change', renderQuestionInputs);

// إضافة سؤال إلى القائمة
let questions = [];
document.getElementById('add-question').addEventListener('click', function() {
    const type = document.getElementById('question-type').value;
    const questionText = document.getElementById('question-text')?.value.trim();
    if (!questionText) {
        showToast('يرجى إدخال نص السؤال!', 'error');
        return;
    }

    let question = { type, text: questionText };
    if (type === 'multiple') {
        const options = Array.from(document.querySelectorAll('.option-input')).map(input => input.value.trim());
        const correctIndex = Array.from(document.querySelectorAll('.correct-option')).findIndex(opt => opt.classList.contains('selected'));
        if (options.some(opt => !opt) || correctIndex === -1) {
            showToast('يرجى إدخال جميع الخيارات واختيار الإجابة الصحيحة!', 'error');
            return;
        }
        question.options = options;
        question.correctAnswer = options[correctIndex];
    } else if (type === 'essay') {
        const answer = document.getElementById('answer-text').value.trim();
        if (!answer) {
            showToast('يرجى إدخال الإجابة النموذجية!', 'error');
            return;
        }
        question.correctAnswer = answer;
    } else if (type === 'list') {
        const answers = Array.from(document.querySelectorAll('.list-input')).map(input => input.value.trim()).filter(val => val);
        if (answers.length === 0) {
            showToast('يرجى إدخال إجابة واحدة على الأقل!', 'error');
            return;
        }
        question.correctAnswers = answers;
    } else if (type === 'truefalse') {
        question.correctAnswer = document.getElementById('truefalse-answer').value;
    }

    questions.push(question);
    renderQuestionsList();
    showToast('تم إضافة السؤال بنجاح!', 'success');
});

// عرض قائمة الأسئلة
function renderQuestionsList() {
    const questionsList = document.getElementById('questions-list');
    questionsList.innerHTML = questions.map((q, index) => `
        <div class="question-item">
            <p><strong>سؤال ${index + 1} (${q.type === 'multiple' ? 'اختياري' : q.type === 'essay' ? 'مقالي' : q.type === 'list' ? 'قائمة' : 'صح/خطأ'}):</strong> ${q.text}</p>
            ${q.options ? `<p>الخيارات: ${q.options.join(', ')} (الصحيح: ${q.correctAnswer})</p>` : ''}
            ${q.correctAnswer && !q.options ? `<p>الإجابة: ${q.correctAnswer}</p>` : ''}
            ${q.correctAnswers ? `<p>الإجابات: ${q.correctAnswers.join(', ')}</p>` : ''}
            <button class="delete-question" data-index="${index}">حذف</button>
        </div>
    `).join('');

    document.querySelectorAll('.delete-question').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = this.dataset.index;
            questions.splice(index, 1);
            renderQuestionsList();
            showToast('تم حذف السؤال!', 'success');
        });
    });
}

// حفظ الاختبار
document.getElementById('save-exam').addEventListener('click', async function() {
    const examName = document.getElementById('exam-name').value.trim();
    const examCode = document.getElementById('exam-code').value.trim();
    const stage = document.getElementById('exam-stage').value;
    const duration = document.getElementById('exam-duration').value.trim();

    if (!examName || !examCode || !duration || questions.length === 0) {
        showToast('يرجى إدخال اسم الاختبار، كود الاختبار، مدة الاختبار، وإضافة سؤال واحد على الأقل!', 'error');
        return;
    }

    if (examCode.length < 6) {
        showToast('كود الاختبار يجب أن يكون 6 أحرف على الأقل!', 'error');
        return;
    }

    if (duration <= 0) {
        showToast('مدة الاختبار يجب أن تكون أكبر من صفر!', 'error');
        return;
    }

    const isCodeAvailable = await checkExamCodeAvailability(examCode);
    if (!isCodeAvailable) {
        showToast('كود الاختبار مستخدم مسبقًا! يرجى اختيار كود آخر.', 'error');
        return;
    }

    try {
        console.log('Saving exam with data:', JSON.stringify({ name: examName, stage, code: examCode, duration: parseInt(duration), questions }, null, 2));
        const response = await fetch('/api/exams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: examName, stage, code: examCode, duration: parseInt(duration), questions })
});

        if (response.ok) {
            const result = await response.json();
            showToast(`تم حفظ الاختبار "${examName}" بكود: ${examCode}`, 'success');
            questions = [];
            renderQuestionsList();
            document.getElementById('exam-name').value = '';
            document.getElementById('exam-code').value = '';
            document.getElementById('exam-duration').value = '';
            document.getElementById('code-availability').style.display = 'none';
        } else {
            const errorData = await response.json();
            console.error('Error saving exam:', errorData);
            showToast(`خطأ في حفظ الاختبار: ${errorData.error || 'غير معروف'}`, 'error');
        }
    } catch (error) {
        console.error('Error saving exam:', error);
        showToast(`خطأ في حفظ الاختبار: ${error.message}`, 'error');
    }
});
// عرض نتائج الاختبار
document.getElementById('fetch-results').addEventListener('click', async function() {
    const examCode = document.getElementById('results-exam-code').value.trim();
    if (!examCode) {
        showToast('يرجى إدخال كود الاختبار!', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/exams/${encodeURIComponent(examCode)}/results`);
        if (!response.ok) {
            const errorData = await response.json();
            showToast(errorData.error || 'كود الاختبار غير صحيح!', 'error');
            return;
        }
        const results = await response.json();
        const resultsList = document.getElementById('exam-results-list');
        if (results.length === 0) {
            resultsList.innerHTML = '<p style="text-align: center; color: #1a2526;">لا توجد نتائج لهذا الاختبار.</p>';
            return;
        }
        resultsList.innerHTML = `
            <table class="test-results-table">
                <thead>
                    <tr>
                        <th>اسم المستخدم</th>
                        <th>النتيجة (%)</th>
                        <th>تاريخ الإكمال</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(result => {
                        let scoreCategory;
                        if (result.score >= 80) scoreCategory = 'excellent';
                        else if (result.score >= 50) scoreCategory = 'good';
                        else scoreCategory = 'poor';
                        return `
                            <tr>
                                <td>${result.studentId}</td>
                                <td data-score="${scoreCategory}">${result.score.toFixed(1)}</td>
                                <td>${new Date(result.completionTime).toLocaleString('ar-EG')}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error fetching exam results:', error);
        showToast(`خطأ في جلب النتائج: ${error.message}`, 'error');
    }
});
    // أضف هذا في آخر الملف قبل `});`
window.logout = function () {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        localStorage.removeItem('loggedInUser');
        window.location.href = 'login.html';
    }
};

// بيانات الفصول كاملة (من الـ PDF اللي بعته، كل الأسماء موجودة ومصححة)
const classesData = {
    1: [  // فصل 1/2 (اللي في الصورة الجديدة)
        { num: 1, name: 'إبراهيم عبدالحميد إبراهيم يونس' },
        { num: 2, name: 'أحمد الطيب أحمد عبدالعزيز محمد' },
        { num: 3, name: 'أحمد جابر أحمد أمين أبوبكر' },
        { num: 4, name: 'أحمد حجاج أحمد محمد محمد' },
        { num: 5, name: 'أحمد سعدي سيد علي' },
        { num: 6, name: 'أحمد محمد سلطان حسن' },
        { num: 7, name: 'أحمد محمد عويس يوسف' },
        { num: 8, name: 'أحمد موسى أحمد حسين حسن' },
        { num: 9, name: 'أدهم محمد حسين أبوالوفا مكي' },
        { num: 10, name: 'أنس مالك حسن يوسف' },
        { num: 11, name: 'بولا صبحي جادالرب لوندي' },
        { num: 12, name: 'حذيفة رمضان عبدالحميد حامد إبراهيم' },
        { num: 13, name: 'الحسن علي محمد علي مصطفى' },
        { num: 14, name: 'حسن محمود يوسف شرقاوي قناوي' },
        { num: 15, name: 'حمزة يوسف شعبان عبدالنعيم موسى' },
        { num: 16, name: 'خالد أحمد أمين سيد يوسف' },
        { num: 17, name: 'خالد علي عبدالرحيم عبدالقادر أحمد' },
        { num: 18, name: 'روماني عبده عزيز عبدالملك خليل' },
        { num: 19, name: 'زياد وائل محمد مهران' },
        { num: 20, name: 'سيف محمود رمضان أحمد' },
        { num: 21, name: 'صالح حسن السيد أحمد' },
        { num: 22, name: 'عبدالرحمن كامل محمد أحمد حسن' },
        { num: 23, name: 'عبدالرحمن محمود أحمد يونس' },
        { num: 24, name: 'عبدالله أحمد بدوي عبدالسميع' },
        { num: 25, name: 'عبدالله أحمد عبدالجواد فهمي' },
        { num: 26, name: 'عبدالله مصطفى عبدالسميع متولي' },
        { num: 27, name: 'علي محمد عبدالدايم علي أحمد' },
        { num: 28, name: 'علي منصور إبراهيم علي عبيد' },
        { num: 29, name: 'عماد الدين محمد عربي إبراهيم' },
        { num: 30, name: 'محمود عبد الرحيم محمود حسن' },
        { num: 31, name: 'مصعب فراج سيد محمد' },
        { num: 32, name: 'معز عصمت عادل أحمد' }
    ],
    2: [  // فصل 2/2
        { num: 1, name: 'أسامة عبدالمحسوب يوسف ضوى' },
        { num: 2, name: 'عبدالرحمن أشرف سيد أحمد' },
        { num: 3, name: 'عبدالرحمن جابر عبدالقادر أحمد' },
        { num: 4, name: 'عمرو خالد موسى أحمد' },
        { num: 5, name: 'عمرو سيد أبو المجد أحمد' },
        { num: 6, name: 'كمال محمود كمال على عبدالعزيز' },
        { num: 7, name: 'كيرلس أبهاب عياد سويحة' },
        { num: 8, name: 'كيرلس متى نبيل نصري عبده' },
        { num: 9, name: 'ماجد عبدالكريم محمد عبدالراضي' },
        { num: 10, name: 'مازن حسين عبدالعاطي علي محمد' },
        { num: 11, name: 'مازن خالد محمد محمد علي' },
        { num: 12, name: 'محمد إبراهيم بدري محجوب أحمد' },
        { num: 13, name: 'محمد إبراهيم عبدالوهاب أحمد' },
        { num: 14, name: 'محمد أحمد السابح علي محمد' },
        { num: 15, name: 'محمد خالد حسان أحمد' },
        { num: 16, name: 'محمد صالح عبد السميع متولي حسين' },
        { num: 17, name: 'محمد صبري عبدالوهاب عبدالراضي' },
        { num: 18, name: 'محمد عاشور أحمد خليل محمد' },
        { num: 19, name: 'محمد عاطف عبدالله محمد سليمان' },
        { num: 20, name: 'محمد عامر قناوي عامر' },
        { num: 21, name: 'محمد عثمان بدر عبدالوهاب' },
        { num: 22, name: 'محمد علي محمد حسان' },
        { num: 23, name: 'محمد محمد صادق محمد' },
        { num: 24, name: 'محمود حسنين عمر صالح محمد' },
        { num: 25, name: 'محمود خليل عبدالعزيز خليل صادق' },
        { num: 26, name: 'معاذ أحمد أبوزيد بدوي' },
        { num: 27, name: 'معاذ محمود حساني محمد' },
        { num: 28, name: 'مينا نبيل كامل عبدالمسيح' },
        { num: 29, name: 'يحيى علي عبدالنعيم علي' },
        { num: 30, name: 'يوسف عبدالرحمن أحمد مصطفى صالح' },
        { num: 31, name: 'يوسف عماد سامي قسطندي' }
    ],
    3: [  // فصل 3/2
        { num: 1, name: 'إسراء علي محمد علي' },
        { num: 2, name: 'إسراء محمود عبد السلام عباس' },
        { num: 3, name: 'أسماء صغير جمعة حامد' },
        { num: 4, name: 'أشرقت عبد الفتاح ذكي عبد السميع' },
        { num: 5, name: 'الزهراء مصطفى عبد الرزاق' },
        { num: 6, name: 'الشيماء محمد عبد الرحمن محمد' },
        { num: 7, name: 'آلاء حمدي محمد كرم' },
        { num: 8, name: 'آلاء موسى محمد عادلي' },
        { num: 9, name: 'أمنية حسانين عزب حسانين' },
        { num: 10, name: 'أنصاف محمد أحمد جاد' },
        { num: 11, name: 'آية محمد النوبي السمان' },
        { num: 12, name: 'إيرين لطفي نسيم سمعان' },
        { num: 13, name: 'إيمان سعد رشيدي أبو الوفا' },
        { num: 14, name: 'آية عادل النداي جهلان' },
        { num: 15, name: 'بوسي أحمد محمد أحمد' },
        { num: 16, name: 'تسنيم علي أحمد محمود' },
        { num: 17, name: 'تسنيم منتصر عبد الحميد محمد' },
        { num: 18, name: 'جنة فيصل عبد المنعم بحر' },
        { num: 19, name: 'جنة حسني خليل أحمد' },
        { num: 20, name: 'جهاد هاني عبد الجواد مصطفى' },
        { num: 21, name: 'حبيبة محمد أحمد حسن' },
        { num: 22, name: 'حسناء علي سعدي حسن' },
        { num: 23, name: 'حنين عبدالحسيب أحمد' },
        { num: 24, name: 'دعاء الحسن محمد مدني' },
        { num: 25, name: 'رحاب رمضان محمد علي' },
        { num: 26, name: 'رؤى أحمد عبد الرحيم سيد' },
        { num: 27, name: 'ريتاج محمد الطاهر مشهد عبد المجيد' },
        { num: 28, name: 'ريفان أحمد محمد كمال' },
        { num: 29, name: 'زينب عبد الرحيم محمد محمود' },
        { num: 30, name: 'زينب عبد العزيز عبد السميع' }
    ],
    4: [  // فصل 4/2
        { num: 1, name: 'جمانة محمد حلمي رجب' },
        { num: 2, name: 'سلمى أحمد السيد أحمد النوبي' },
        { num: 3, name: 'شمس حسين رمضان أحمد' },
        { num: 4, name: 'شيماء عبد المنعم السابح علي' },
        { num: 5, name: 'صفاء فراج محمد النجار' },
        { num: 6, name: 'ضحى بدوي حسن محمود' },
        { num: 7, name: 'ضحى حسين زكي محمد' },
        { num: 8, name: 'فاطمة أحمد حسان أحمد' },
        { num: 9, name: 'فاطمة شعبان محمد السيد' },
        { num: 10, name: 'فاطمة مرتضى عبد القادر' },
        { num: 11, name: 'فرحة سالم إبراهيم سالم' },
        { num: 12, name: 'لمياء أحمد محمد عبد الراضي' },
        { num: 13, name: 'مرفات مصطفى علي يوسف' },
        { num: 14, name: 'مروة أحمد حامد قناوي' },
        { num: 15, name: 'مروة حسن أحمد فرشوطي' },
        { num: 16, name: 'مروة خالد محمد البسطاوي' },
        { num: 17, name: 'مريم عبدالرحمن محمد إبراهيم' },
        { num: 18, name: 'مريم محمد عبد المحسن محمود' },
        { num: 19, name: 'مريم محمود عبد الحفيظ أحمد' },
        { num: 20, name: 'ملك محمد قرقار محمد' },
        { num: 21, name: 'منه منصور أبو الحجاج السيد' },
        { num: 22, name: 'ميرهان محمود محمد زكي' },
        { num: 23, name: 'نوال عصام أحمد محمد' },
        { num: 24, name: 'نورهان رفاعي عبد الحميد توفيق' },
        { num: 25, name: 'هاجر حجاج سيد النوبي' },
        { num: 26, name: 'هاجر قرني خيري عرفات' },
        { num: 27, name: 'هند خليفة محمود علي' },
        { num: 28, name: 'ياسمين أحمد يوسف عثمان' },
        { num: 29, name: 'ياسمين رجب عياد مرعزي' },
        { num: 30, name: 'ياسمين منصور عبيد أحمد' }
    ],
    5: [  // فصل 1/1 (اللي كان 5/2 سابقًا)
        { num: 1, name: 'محمد أحمد محمد أبوالمجد' },
        { num: 2, name: 'أسامة محمد فكري حسين' },
        { num: 3, name: 'ذياد محمد خيري الراوي' },
        { num: 4, name: 'محمد أحمد محمد أحمد' },
        { num: 5, name: 'عبد الله محمد جمعة حسين ملك' },
        { num: 6, name: 'عبد الرحمن حسن أحمد حسن' },
        { num: 7, name: 'أحمد سعدي عباس عبد الراضي' },
        { num: 8, name: 'أحمد حسن جلال إسماعيل' },
        { num: 9, name: 'حمزة إدريس محمد قاسم' },
        { num: 10, name: 'عبدالرحمن طارق حمدان الضوي' },
        { num: 11, name: 'دليا عبد السلام بدري محمد' },
        { num: 12, name: 'سارة عامر عبدالراضي صديق' },
        { num: 13, name: 'شاهندا صابر سيد سعدي أحمد' },
        { num: 14, name: 'فاطمة خيري عبدالله محمد' },
        { num: 15, name: 'ملك تيسير محمد الزاهر' },
        { num: 16, name: 'رضوى محمد فتحي عبدالحميد' },
        { num: 17, name: 'نوران أحمد رشدي قناوي' },
        { num: 18, name: 'هاجر عبد النعيم رمضان بشاري' },
        { num: 19, name: 'زينب محمد عبد الدايم محمد' },
        { num: 20, name: 'ملك محمد أحمد محمد' },
        { num: 21, name: 'آية سعد الله عبد الله علي' },
        { num: 22, name: 'منة أحمد عبد الفتاح أحمد' },
        { num: 23, name: 'زمزم مصطفى فؤاد محمود' }
    ]
};

// عرض أزرار الفصول
document.getElementById('show-classes-btn')?.addEventListener('click', () => {
    document.getElementById('classes-buttons').style.display = 'flex';
    document.getElementById('show-classes-btn').style.display = 'none';
});

// عرض جدول الفصل المختار + تفعيل البحث
document.querySelectorAll('.class-btn')?.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const classNum = e.target.dataset.class;
        const studentsList = classesData[classNum];
        const title = classNum === '5' ? 'فصل 1/1' : `فصل ${classNum}/2`;

        // تعبئة العنوان
        document.getElementById('class-title').textContent = title;

        // تعبئة الجدول بالطريقة الصحيحة
        const tbody = document.querySelector('#students-table tbody');
        tbody.innerHTML = studentsList.map(student => 
            `<tr><td>\( {student.num}</td><td> \){student.name}</td></tr>`
        ).join('');

        // إظهار الجدول وخانة البحث
        document.getElementById('class-table-container').style.display = 'block';
        document.getElementById('student-search-section').style.display = 'block';
        document.getElementById('classes-buttons').style.display = 'none';

        // تصفير خانة البحث
        document.getElementById('student-search').value = '';
    });
});

// خاصية البحث داخل الجدول
document.getElementById('student-search')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    const rows = document.querySelectorAll('#students-table tbody tr');

    rows.forEach(row => {
        const nameCell = row.cells[1]; // العمود الثاني = اسم الطالب
        const name = nameCell ? nameCell.textContent.toLowerCase() : '';
        row.style.display = name.includes(searchTerm) ? '' : 'none';
    });
});




// استدعاء دالة إنشاء الواجهة عند التحميل
renderQuestionInputs();
    loadInitialData();
    renderAdminWelcomeMessage();
});
