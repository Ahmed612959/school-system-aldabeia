const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const pdfParse = require('pdf-parse');
const crypto = require('crypto');
const serverless = require('serverless-http'); // مهم جدًا

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ربط MongoDB من Environment Variables
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is missing!');
  process.exit(1);
}

mongoose.connect(uri)
  .then(() => console.log('تم الاتصال بـ MongoDB'))
  .catch(err => console.error('خطأ في الاتصال:', err));

// === النماذج (Schemas) ===
const adminSchema = new mongoose.Schema({
    fullName: String,
    username: String,
    password: String
});

const studentSchema = new mongoose.Schema({
    fullName: String,
    id: String,
    username: String,
    password: String,
    originalPassword: String,
    semester: { type: String, enum: ['first', 'second'], default: 'first' },
    subjects: [{ name: String, grade: Number }],
    profile: {
        email: String,
        phone: String,
        birthdate: String,
        address: String,
        bio: String
    }
});

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
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
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
        const hashedPassword = crypto.createHash('sha256').update(originalPassword).digest('hex');
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

app.post('/api/register-student', async (req, res) => {
    try {
        const { fullName, username, id, email, phone, birthdate, address, password } = req.body;

        if (!fullName || !username || !id || !email || !phone || !birthdate || !address || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!/^STU\d{3}$/.test(id)) {
            return res.status(400).json({ error: 'Student code must be in the format STU followed by 3 digits' });
        }

        if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
            return res.status(400).json({ error: 'Username must be 3-20 characters (letters and numbers only)' });
        }

        const existingAdmins = await Admin.find();
        const existingStudents = await Student.find();
        const allUsers = [...existingAdmins, ...existingStudents];

        if (allUsers.some(user => user.id === id)) {
            return res.status(400).json({ error: 'Student code already used' });
        }

        if (allUsers.some(user => user.username === username)) {
            return res.status(400).json({ error: 'Username already used' });
        }

        if (allUsers.some(user => user.profile && user.profile.email === email)) {
            return res.status(400).json({ error: 'Email already used' });
        }

        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        const student = new Student({
            fullName,
            id,
            username,
            password: hashedPassword,
            originalPassword: password,
            subjects: [],
            profile: { email, phone, birthdate, address, bio: '' }
        });

        await student.save();
        res.json({ message: 'Student account created successfully', username });
    } catch (error) {
        console.error('Error creating student account:', error);
        res.status(500).json({ error: 'Error creating account: ' + error.message });
    }
});

// === Vercel Serverless Handler ===
module.exports.handler = serverless(app);

