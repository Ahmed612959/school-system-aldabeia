const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const pdfParse = require('pdf-parse');
const bcrypt = require('bcrypt');
const crypto = require('crypto'); // لو لسه محتاجه

const serverless = require('serverless-http'); // مهم جدًا

const app = express(); 

// ====================== MIDDLEWARE (مهم جداً) ======================
app.use(cors({
    origin: '*',                    // للتجربة - يمكنك تغييره لاحقاً
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// يجب أن يكون قبل أي Routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// إذا كان bodyParser موجود، يفضل إزالته أو وضعه بعد الـ express.json
// app.use(bodyParser.json());   ← احذفه إذا كان موجود

app.use(express.static('public')); 

// ربط MongoDB
const uri = process.env.MONGODB_URI; 
if (!uri) { 
  console.error('MONGODB_URI is missing!'); 
  process.exit(1); 
} 

mongoose.connect(uri) 
  .then(() => console.log('تم الاتصال بـ MongoDB')) 
  .catch(err => console.error('خطأ في الاتصال:', err));

// ====================== النماذج (Schemas) ======================
// (اترك باقي الـ Schemas كما هي - لا تغيرها)
// === النماذج (Schemas) ===
const adminSchema = new mongoose.Schema({
    fullName: String,
    username: String,
    password: String
});

const studentSchema = new mongoose.Schema({
    fullName: String,

    studentCode: { // 👈 بدل id
        type: String,
        required: true,
        unique: true
    },

    username: {
        type: String,
        unique: true
    },

    password: String,

    profile: {
        phone: String,
        parentName: String,
        parentId: String
    }

}, { timestamps: true });

const violationSchema = new mongoose.Schema({
    studentId: String,
    type: String,
    reason: String,
    penalty: String,
    parentSummons: Boolean,
    date: String
});

const notificationSchema = new mongoose.Schema({
    text: String,
    date: String
});

const Admin = mongoose.model('Admin', adminSchema);
const Student = mongoose.model('Student', studentSchema);
const Violation = mongoose.model('Violation', violationSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// === دوال مساعدة ===
function generateUniqueUsername(fullName, id, existingUsers) {
    let baseUsername = fullName.toLowerCase().replace(/\s+/g, '').slice(0, 10) + id.slice(-2);
    let username = baseUsername;
    let counter = 1;
    while (existingUsers.some(user => user.username === username)) {
        username = `${baseUsername}${counter}`;
        counter++;
    }
    return username;
}

function generatePassword(fullName) {
    const firstName = fullName.split(' ')[0];
    return `${firstName.charAt(0).toUpperCase() + firstName.slice(1)}1234@`;
}

// === نموذج مسابقة الأسبوع ===
const weeklyQuizSchema = new mongoose.Schema({
    weekNumber: { type: Number, required: true },  // رقم الأسبوع في السنة
    question: { type: String, required: true },
    options: [{ type: String, required: true }],   // 4 إجابات
    correctIndex: { type: Number, required: true }, // رقم الإجابة الصح (0-3)
    winners: [{                                    // أول 5 يجاوبوا صح
        studentId: String,
        username: String,
        fullName: String,
        answeredAt: { type: Date, default: Date.now }
    }],
    isActive: { type: Boolean, default: true }
});

const WeeklyQuiz = mongoose.model('WeeklyQuiz', weeklyQuizSchema);

// === كل الـ API Routes ===
app.get('/api/admins', async (req, res) => {
    try {
        const admins = await Admin.find();
        res.json(admins);
    } catch (error) {
        console.error('خطأ في جلب الأدمنز:', error);
        res.status(500).json({ error: 'خطأ في جلب الأدمنز' });
    }
});


app.post('/api/admins', async (req, res) => {
    try {
        const { fullName, username, password } = req.body;

        const existingAdmins = await Admin.find();
        const existingStudents = await Student.find();

        if (existingAdmins.some(a => a.username === username) || existingStudents.some(s => s.username === username)) {
            return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);   // ← التعديل المهم

        const newAdmin = new Admin({ fullName, username, password: hashedPassword });
        await newAdmin.save();

        res.json({ message: 'تم إضافة الأدمن', admin: newAdmin });
    } catch (error) {
        console.error('خطأ في إضافة الأدمن:', error);
        res.status(500).json({ error: 'خطأ في إضافة الأدمن' });
    }
});

app.delete('/api/admins/:username', async (req, res) => {
    try {
        const admins = await Admin.find();
        if (admins.length <= 1) {
            return res.status(400).json({ error: 'لا يمكن حذف آخر أدمن' });
        }
        await Admin.deleteOne({ username: req.params.username });
        res.json({ message: 'تم حذف الأدمن' });
    } catch (error) {
        console.error('خطأ في حذف الأدمن:', error);
        res.status(500).json({ error: 'خطأ في حذف الأدمن' });
    }
});

app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find();
        res.json(students);
    } catch (error) {
        console.error('خطأ في جلب الطلاب:', error);
        res.status(500).json({ error: 'خطأ في جلب الطلاب' });
    }
});

app.post('/api/students', async (req, res) => {
    try {
        const { fullName, id, subjects, semester } = req.body;
        const existingAdmins = await Admin.find();
        const existingStudents = await Student.find();
        const username = generateUniqueUsername(fullName, id, [...existingAdmins, ...existingStudents]);
        const originalPassword = generatePassword(fullName);
const hashedPassword = await bcrypt.hash(originalPassword, 10);
        const newStudent = new Student({
            fullName,
            id,
            username,
            password: hashedPassword,
            originalPassword,
            semester: semester || 'first',
            subjects,
            profile: { email: '', phone: '', birthdate: '', address: '', bio: '' }
        });
        await newStudent.save();
        res.json({ message: 'تم إضافة الطالب', student: newStudent });
    } catch (error) {
        console.error('خطأ في إضافة الطالب:', error);
        res.status(500).json({ error: 'خطأ في إضافة الطالب' });
    }
});

app.put('/api/students/:id', async (req, res) => {
    try {
        const { subjects, semester } = req.body;
        const updateData = { subjects };
        if (semester) updateData.semester = semester;
        await Student.findOneAndUpdate({ id: req.params.id }, updateData, { new: true });
        res.json({ message: 'تم تحديث الطالب' });
    } catch (error) {
        console.error('خطأ في تحديث الطالب:', error);
        res.status(500).json({ error: 'خطأ في تحديث الطالب' });
    }
});

app.delete('/api/students/:id', async (req, res) => {
    try {
        await Student.deleteOne({ id: req.params.id });
        await Violation.deleteMany({ studentId: req.params.id });
        res.json({ message: 'تم حذف الطالب' });
    } catch (error) {
        console.error('خطأ في حذف الطالب:', error);
        res.status(500).json({ error: 'خطأ في حذف الطالب' });
    }
});

app.get('/api/violations', async (req, res) => {
    try {
        const violations = await Violation.find();
        res.json(violations);
    } catch (error) {
        console.error('خطأ في جلب المخالفات:', error);
        res.status(500).json({ error: 'خطأ في جلب المخالفات' });
    }
});

app.post('/api/violations', async (req, res) => {
    try {
        const newViolation = new Violation(req.body);
        await newViolation.save();
        res.json({ message: 'تم إضافة المخالفة', violation: newViolation });
    } catch (error) {
        console.error('خطأ في إضافة المخالفة:', error);
        res.status(500).json({ error: 'خطأ في إضافة المخالفة' });
    }
});

app.delete('/api/violations/:id', async (req, res) => {
    try {
        await Violation.findByIdAndDelete(req.params.id);
        res.json({ message: 'تم حذف المخالفة' });
    } catch (error) {
        console.error('خطأ في حذف المخالفة:', error);
        res.status(500).json({ error: 'خطأ في حذف المخالفة' });
    }
});

app.get('/api/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find();
        res.json(notifications);
    } catch (error) {
        console.error('خطأ في جلب الإشعارات:', error);
        res.status(500).json({ error: 'خطأ في جلب الإشعارات' });
    }
});

app.post('/api/notifications', async (req, res) => {
    try {
        const newNotification = new Notification(req.body);
        await newNotification.save();
        res.json({ message: 'تم إضافة الإشعار', notification: newNotification });
    } catch (error) {
        console.error('خطأ في إضافة الإشعار:', error);
        res.status(500).json({ error: 'خطأ في إضافة الإشعار' });
    }
});

app.delete('/api/notifications/:id', async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ message: 'تم حذف الإشعار' });
    } catch (error) {
        console.error('خطأ في حذف الإشعار:', error);
        res.status(500).json({ error: 'خطأ في حذف الإشعار' });
    }
});

app.post('/api/analyze-pdf', async (req, res) => {
    try {
        const { pdfData } = req.body;

        if (!pdfData || typeof pdfData !== 'string') {
            return res.status(400).json({ error: 'بيانات PDF غير صالحة أو مفقودة' });
        }

        let buffer;
        try {
            buffer = Buffer.from(pdfData, 'base64');
        } catch (error) {
            return res.status(400).json({ error: 'بيانات Base64 غير صالحة' });
        }

        const data = await pdfParse(buffer);
        const text = data.text;
        const lines = text.split(/\r?\n/).filter(line => line.trim());

        const validSubjects = [
            'مبادئ وأسس تمريض',
            'اللغة العربية',
            'اللغة الإنجليزية',
            'الفيزياء',
            'الكيمياء',
            'التشريح/علم وظائف الأعضاء',
            'التربية الدينية',
            'الكمبيوتر',
            'التاريخ',
            'الجغرافيا'
        ];

        const normalizeSubject = (subject) => {
            let normalized = subject
                .replace(/اإل/g, 'الإ')
                .replace(/أ/g, 'ا')
                .replace(/ی/g, 'ي')
                .replace(/ة/g, 'ه')
                .replace(/[\/\\]/g, '/')
                .replace(/إ/g, 'ا')
                .replace(/\s+/g, ' ')
                .trim();

            if (normalized.includes('مبادئ') && normalized.includes('تمريض')) return 'مبادئ وأسس تمريض';
            if (normalized.includes('عربيه') || normalized.includes('عربية')) return 'اللغة العربية';
            if (normalized.includes('انجليزيه') || normalized.includes('إنجليزية') || normalized.includes('انجلیزیه')) return 'اللغة الإنجليزية';
            if (normalized.includes('فيزياء') || normalized.includes('فیزیاء')) return 'الفيزياء';
            if (normalized.includes('كيمياء') || normalized.includes('كیمیاء')) return 'الكيمياء';
            if (normalized.includes('تشريح') || normalized.includes('تشریح') || normalized.includes('وظائف')) return 'التشريح/علم وظائف الأعضاء';
            if (normalized.includes('تربيه') || normalized.includes('دينيه') || normalized.includes('دينية')) return 'التربية الدينية';
            if (normalized.includes('كمبيوتر') || normalized.includes('كمبیوتر')) return 'الكمبيوتر';
            if (normalized.includes('تاريخ') || normalized.includes('تاریخ')) return 'التاريخ';
            if (normalized.includes('جغرافيا') || normalized.includes('جغرافیاء')) return 'الجغرافيا';
            return normalized;
        };

        const allResults = [];
        let currentStudent = null;
        let grades = [];
        let semester = 'first';
        const ignoredLines = [];

        for (const line of lines) {
            const cleanedLine = line.trim().replace(/\s+/g, ' ');

            const semesterMatch = cleanedLine.match(/(?:الترم|Semester):?\s*(الأول|الثاني|first|second)/i);
            if (semesterMatch) {
                semester = semesterMatch[1].includes('الأول') || semesterMatch[1].toLowerCase() === 'first' ? 'first' : 'second';
                continue;
            }

            const studentMatch = cleanedLine.match(/(?:طالب|الطالب|Student):?\s*([^-\n]+?)\s*[-–—]?\s*(?:رقم الجلوس|رقم|ID):?\s*(\d+)/i);
            if (studentMatch) {
                if (currentStudent && grades.length > 0) {
                    allResults.push({
                        name: currentStudent.fullName,
                        id: currentStudent.id,
                        semester,
                        results: Object.fromEntries(grades.map(g => [g.name, g.grade]))
                    });
                    const existingAdmins = await Admin.find();
                    const existingStudents = await Student.find();
                    let student = await Student.findOne({ id: currentStudent.id });
                    if (student) {
                        student.subjects = grades;
                        student.semester = semester;
                        await student.save();
                    } else {
                        const username = generateUniqueUsername(currentStudent.fullName, currentStudent.id, [...existingAdmins, ...existingStudents]);
                        const originalPassword = generatePassword(currentStudent.fullName);
                        const hashedPassword = crypto.createHash('sha256').update(originalPassword).digest('hex');
                        student = new Student({
                            fullName: currentStudent.fullName,
                            id: currentStudent.id,
                            username,
                            password: hashedPassword,
                            originalPassword,
                            semester,
                            subjects: grades,
                            profile: { email: '', phone: '', birthdate: '', address: '', bio: '' }
                        });
                        await student.save();
                    }
                }
                currentStudent = {
                    fullName: studentMatch[1].trim(),
                    id: studentMatch[2].trim()
                };
                grades = [];
            } else if (cleanedLine.includes(':')) {
                const [subject, grade] = cleanedLine.split(':').map(s => s.trim());
                const normalizedSubject = normalizeSubject(subject);
                if (validSubjects.includes(normalizedSubject) && !isNaN(parseInt(grade))) {
                    if ((normalizedSubject === 'التاريخ' && semester === 'first') || 
                        (normalizedSubject === 'الجغرافيا' && semester === 'second') || 
                        !['التاريخ', 'الجغرافيا'].includes(normalizedSubject)) {
                        grades.push({ name: normalizedSubject, grade: parseInt(grade) });
                    } else {
                        ignoredLines.push(cleanedLine);
                    }
                } else {
                    ignoredLines.push(cleanedLine);
                }
            } else {
                ignoredLines.push(cleanedLine);
            }
        }

        if (currentStudent && grades.length > 0) {
            allResults.push({
                name: currentStudent.fullName,
                id: currentStudent.id,
                semester,
                results: Object.fromEntries(grades.map(g => [g.name, g.grade]))
            });
            const existingAdmins = await Admin.find();
            const existingStudents = await Student.find();
            let student = await Student.findOne({ id: currentStudent.id });
            if (student) {
                student.subjects = grades;
                student.semester = semester;
                await student.save();
            } else {
                const username = generateUniqueUsername(currentStudent.fullName, currentStudent.id, [...existingAdmins, ...existingStudents]);
                const originalPassword = generatePassword(currentStudent.fullName);
                const hashedPassword = crypto.createHash('sha256').update(originalPassword).digest('hex');
                student = new Student({
                    fullName: currentStudent.fullName,
                    id: currentStudent.id,
                    username,
                    password: hashedPassword,
                    originalPassword,
                    semester,
                    subjects: grades,
                    profile: { email: '', phone: '', birthdate: '', address: '', bio: '' }
                });
                await student.save();
            }
        }

        if (allResults.length === 0) {
            return res.status(400).json({ 
                error: 'لا توجد بيانات طلاب أو درجات صالحة في الملف',
                details: { extractedLines: lines, ignoredLines }
            });
        }

        res.json({ message: 'تم تحليل PDF بنجاح', results: allResults });
    } catch (error) {
        console.error('خطأ في تحليل PDF:', error);
        res.status(500).json({ error: 'خطأ في تحليل الملف: ' + error.message });
    }
});

app.post('/api/check-username', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'اسم المستخدم مطلوب' });
        }

        // جلب كل المستخدمين مرة واحدة (admins + students)
        const [existingAdmins, existingStudents] = await Promise.all([
            Admin.find({ username }).lean(),
            Student.find({ username }).lean()
        ]);

        const isAvailable = existingAdmins.length === 0 && existingStudents.length === 0;

        console.log(`Check username: ${username} → Available: ${isAvailable}`);
        res.json({ available: isAvailable });
    } catch (error) {
        console.error('Error checking username:', error);
        res.status(500).json({ error: 'خطأ في التحقق من اسم المستخدم' });
    }
});

// === باقي الـ routes (exams, register-student) ===
const examSchema = new mongoose.Schema({
    name: { type: String, required: true },
    stage: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    duration: { type: Number, required: true },
    questions: [{
        type: { type: String, required: true },
        text: { type: String, required: true },
        options: [String],
        correctAnswer: String,
        correctAnswers: [String]
    }]
});
const Exam = mongoose.model('Exam', examSchema);

const examResultSchema = new mongoose.Schema({
    examCode: { type: String, required: true },
    studentId: { type: String, required: true },
    score: { type: Number, required: true },
    completionTime: { type: Date, default: Date.now }
});
const ExamResult = mongoose.model('ExamResult', examResultSchema);

app.post('/api/exams/check-code', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'كود الاختبار مطلوب' });
        const exam = await Exam.findOne({ code });
        res.json({ available: !exam });
    } catch (error) {
        res.status(500).json({ error: 'فشل في التحقق من الكود' });
    }
});

app.post('/api/exams', async (req, res) => {
    try {
        const { name, stage, code, duration, questions } = req.body;
        if (!name || !stage || !code || !duration || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ error: 'البيانات غير مكتملة أو غير صحيحة' });
        }
        const exam = new Exam({ name, stage, code, duration, questions });
        await exam.save();
        res.json({ message: 'تم حفظ الاختبار', code });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ error: 'كود الاختبار مستخدم مسبقًا' });
        } else {
            res.status(500).json({ error: `فشل في حفظ الاختبار: ${error.message}` });
        }
    }
});

app.get('/api/exams/:code', async (req, res) => {
    try {
        const code = decodeURIComponent(req.params.code);
        const exam = await Exam.findOne({ code });
        if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });
        res.json(exam);
    } catch (error) {
        res.status(500).json({ error: `فشل في جلب الاختبار: ${error.message}` });
    }
});

app.post('/api/exams/submit', async (req, res) => {
    try {
        const { examCode, studentId, score } = req.body;
        const result = new ExamResult({ examCode, studentId, score });
        await result.save();
        res.json({ message: 'تم حفظ النتيجة' });
    } catch (error) {
        res.status(500).json({ error: 'فشل في إرسال النتيجة' });
    }
});

app.get('/api/exams/:code/results', async (req, res) => {
    try {
        const code = decodeURIComponent(req.params.code);
        const results = await ExamResult.find({ examCode: code }).select('studentId score completionTime');
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: `فشل في جلب نتائج الاختبار: ${error.message}` });
    }
});



// ====================== Register Student ======================
// ====================== Register Student - الحل النهائي ======================
app.post('/api/register-student', async (req, res) => {
    try {
        console.log("📥 Raw req.body received:", JSON.stringify(req.body, null, 2));
        console.log("📋 Available keys:", Object.keys(req.body || {}));

        // استخراج الحقول بطريقة مباشرة وآمنة
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
            hasPassword: password.length > 0,
            studentCode, 
            phone, 
            parentName, 
            parentId 
        });

        // Validation
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
                    parentId: !!parentId
                }
            });
        }

        if (studentCode.length !== 7) {
            return res.status(400).json({ error: 'رقم الجلوس لازم يكون 7 أرقام بالضبط' });
        }

        if (parentId.length !== 14) {
            return res.status(400).json({ error: 'رقم بطاقة ولي الأمر لازم يكون 14 رقم بالضبط' });
        }

        if (username.length < 3 || !/^[a-zA-Z0-9]{3,20}$/.test(username)) {
            return res.status(400).json({ error: 'اسم المستخدم غير صالح' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
        }

        // التحقق من التكرار
        const [existCode, existUser] = await Promise.all([
            Student.findOne({ studentCode }),
            Student.findOne({ username })
        ]);

        if (existCode) return res.status(400).json({ error: 'هذا الكود مستخدم بالفعل' });
        if (existUser) return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' });

        // تشفير الباسورد
        const hashed = await bcrypt.hash(password, 10);

        const student = new Student({
            fullName,
            username,
            studentCode,
            password: hashed,
            profile: { phone, parentName, parentId }
        });

        await student.save();

        console.log(`✅ Success: Student ${username} created`);

        res.json({ 
            success: true, 
            message: 'تم إنشاء الحساب بنجاح',
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

// ====================== Login Route - نسخة Debug قوية ======================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
        }

        console.log(`🔑 محاولة تسجيل دخول: ${username}`);

        // === الأدمن ===
        const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
        if (admin) {
            console.log('✓ تم العثور على أدمن');
            const isMatch = await bcrypt.compare(password, admin.password);
            if (isMatch) {
                console.log(`✅ أدمن ناجح: ${admin.username}`);
                return res.json({
                    success: true,
                    user: { username: admin.username, fullName: admin.fullName, type: 'admin' }
                });
            } else {
                console.log('❌ كلمة مرور أدمن خاطئة');
            }
        }

        // === الطالب ===
        const student = await Student.findOne({ username: username.toLowerCase().trim() });
        if (student) {
            console.log('✓ تم العثور على طالب');
            const isMatch = await bcrypt.compare(password, student.password);
            if (isMatch) {
                console.log(`✅ طالب ناجح: ${student.username}`);
                return res.json({
                    success: true,
                    user: {
                        username: student.username,
                        fullName: student.fullName,
                        type: 'student',
                        id: student.studentCode || student.id
                    }
                });
            } else {
                console.log('❌ كلمة مرور طالب خاطئة');
            }
        }

        console.log(`❌ بيانات خاطئة: ${username}`);
        return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });

    } catch (error) {
        console.error('🚨 Login Server Error:', error);
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        
        res.status(500).json({ 
            error: 'حدث خطأ داخلي في السيرفر',
            details: error.message 
        });
    }
});
// ====================================================
// الـ Routes اللي ناقصة عشان البروفايل يشتغل 100%
// ====================================================

// تحديث ملف الطالب الشخصي (الأهم على الإطلاق)
// ==================== إضافة الـ GET routes المفقودة (الحل النهائي) ====================

// جلب بيانات طالب واحد بالـ username
app.get('/api/students/:username', async (req, res) => {
    try {
        const student = await Student.findOne({ username: req.params.username });
        if (!student) {
            return res.status(404).json({ error: 'الطالب غير موجود' });
        }
        res.json(student);
    } catch (error) {
        console.error('خطأ في جلب بيانات الطالب:', error);
        res.status(500).json({ error: 'فشل في جلب البيانات' });
    }
});

// تحديث profile للطالب
app.put('/api/students/:username', async (req, res) => {
    try {
        const { profile } = req.body;
        const updated = await Student.findOneAndUpdate(
            { username: req.params.username },
            { profile },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'الطالب غير موجود' });
        res.json({ message: 'تم تحديث الملف الشخصي', student: updated });
    } catch (error) {
        console.error('خطأ في تحديث profile الطالب:', error);
        res.status(500).json({ error: 'فشل في التحديث' });
    }
});

// تحديث profile للأدمن (اختياري - لو عايز الأدمن يعدل حاجة)
app.put('/api/admins/:username', async (req, res) => {
    try {
        const { profile } = req.body;
        const updated = await Admin.findOneAndUpdate(
            { username: req.params.username },
            { profile: profile || {} },
            { new: true, upsert: true }
        );
        res.json({ message: 'تم تحديث بيانات الأدمن', admin: updated });
    } catch (error) {
        res.status(500).json({ error: 'فشل في التحديث' });
    }
});
// جلب بيانات أدمن واحد بالـ username
app.get('/api/admins/:username', async (req, res) => {
    try {
        const admin = await Admin.findOne({ username: req.params.username });
        if (!admin) {
            return res.status(404).json({ error: 'الأدمن غير موجود' });
        }
        res.json(admin);
    } catch (error) {
        console.error('خطأ في جلب بيانات الأدمن:', error);
        res.status(500).json({ error: 'فشل في جلب البيانات' });
    }
});

// ════════════════════════════════════════════════════
// نور 3.0 – شغالة بـ Gemini 1.5 Flash (مضمونة 100%)
// ════════════════════════════════════════════════════
app.post('/api/nour', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt || prompt.toString().trim() === '') {
            return res.json({ reply: "اكتب حاجة الأول يا وحش!" });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();

        if (!GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY مش موجود في الـ Environment");
            return res.json({ reply: "نور نايمة دلوقتي يا بطل… كلمني بعد شوية" });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: `أنت نور، مساعد ذكي مصري خفيف الدم ومرح جدًا وبتحب التمريض أوي.
بترد دايمًا بالعامية المصرية الحلوة وبتقول يا وحش، يا بطل، يا أسطورة، يا دكتور.
لو سألوك عن الدرجات قولهم يروحوا قسم "النتايج".
السؤال: ${prompt}` }]
                    }],
                    generationConfig: { temperature: 0.9, maxOutputTokens: 1000 }
                })
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error("Gemini Error:", err);
            return res.json({ reply: "ثانية يا بطل… في حاجة حصلت، جرب تاني" });
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() 
                      || "معلش يا وحش… الكلام اتلخبط، قول تاني";

        res.json({ reply: reply.replace(/^\*\*|\*\*$/g, "").trim() });

    } catch (err) {
        console.error("خطأ في /api/nour:", err.message);
        res.json({ reply: "النت وقع يا أسطورة… جرب تاني بعد شوية" });
    }
});

// === Vercel Serverless Handler ===
// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled Server Error:', err);
    res.status(500).json({ 
        error: 'خطأ داخلي في السيرفر',
        details: err.message 
    });
});

module.exports.handler = serverless(app);








