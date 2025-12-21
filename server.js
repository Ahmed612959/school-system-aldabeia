const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const pdfParse = require('pdf-parse');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// ربط MongoDB
const uri = "mongodb+srv://myadmin:MySecurePass123@cluster0.1cou98u.mongodb.net/adminDB?retryWrites=true&w=majority";
mongoose.connect(uri)
    .then(() => console.log('تم الاتصال بقاعدة البيانات MongoDB'))
    .catch(err => console.error('خطأ في الاتصال بـ MongoDB:', err));

// تعريف النماذج (Schemas)
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
        phone: String,
        parentName: String,
        parentId: String
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

// دوال مساعدة
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

// API Routes
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
            semester: semester || 'first', // القيمة الافتراضية إذا لم يتم تمرير semester
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
        if (semester) updateData.semester = semester; // تحديث الترم إذا تم تمريره
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

        // التحقق من وجود pdfData
        if (!pdfData || typeof pdfData !== 'string') {
            console.error('pdfData غير صالح أو مفقود:', pdfData);
            return res.status(400).json({ error: 'بيانات PDF غير صالحة أو مفقودة' });
        }

        // تحويل Base64 إلى Buffer
        let buffer;
        try {
            buffer = Buffer.from(pdfData, 'base64');
        } catch (error) {
            console.error('خطأ في تحويل Base64 إلى Buffer:', error.message);
            return res.status(400).json({ error: 'بيانات Base64 غير صالحة' });
        }

        // تحليل الـ PDF
        const data = await pdfParse(buffer);
        const text = data.text;
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        console.log('الأسطر المستخرجة من الـ PDF:', lines);

        // قائمة المواد المتوقعة
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

        // دالة لتطبيع أسماء المواد
        const normalizeSubject = (subject) => {
            let normalized = subject
                .replace(/اإل/g, 'الإ') // تصحيح "اإل" إلى "الإ"
                .replace(/أ/g, 'ا') // استبدال "أ" بـ "ا"
                .replace(/ی/g, 'ي') // تصحيح "ی" إلى "ي"
                .replace(/ة/g, 'ه') // تصحيح "ة" إلى "ه"
                .replace(/[\/\\]/g, '/') // تطبيع الفواصل
                .replace(/إ/g, 'ا') // استبدال "إ" بـ "ا" إذا لزم
                .replace(/\s+/g, ' ') // إزالة المسافات الزائدة
                .trim();

            // تصحيح يدوي لأسماء المواد المعقدة
            if (normalized.includes('مبادئ') && normalized.includes('تمريض')) {
                return 'مبادئ وأسس تمريض';
            }
            if (normalized.includes('عربيه') || normalized.includes('عربية')) {
                return 'اللغة العربية';
            }
            if (normalized.includes('انجليزيه') || normalized.includes('إنجليزية') || normalized.includes('انجلیزیه')) {
                return 'اللغة الإنجليزية';
            }
            if (normalized.includes('فيزياء') || normalized.includes('فیزیاء')) {
                return 'الفيزياء';
            }
            if (normalized.includes('كيمياء') || normalized.includes('كیمیاء')) {
                return 'الكيمياء';
            }
            if (normalized.includes('تشريح') || normalized.includes('تشریح') || normalized.includes('وظائف')) {
                return 'التشريح/علم وظائف الأعضاء';
            }
            if (normalized.includes('تربيه') || normalized.includes('دينيه') || normalized.includes('دينية')) {
                return 'التربية الدينية';
            }
            if (normalized.includes('كمبيوتر') || normalized.includes('كمبیوتر')) {
                return 'الكمبيوتر';
            }
            if (normalized.includes('تاريخ') || normalized.includes('تاریخ')) {
                return 'التاريخ';
            }
            if (normalized.includes('جغرافيا') || normalized.includes('جغرافیاء')) {
                return 'الجغرافيا';
            }
            return normalized;
        };

        const allResults = [];
        let currentStudent = null;
        let grades = [];
        let semester = 'first'; // القيمة الافتراضية
        const ignoredLines = [];

        for (const line of lines) {
            // تنظيف السطر من المسافات الزائدة
            const cleanedLine = line.trim().replace(/\s+/g, ' ');

            // التحقق من وجود الترم
            const semesterMatch = cleanedLine.match(/(?:الترم|Semester):?\s*(الأول|الثاني|first|second)/i);
            if (semesterMatch) {
                semester = semesterMatch[1].includes('الأول') || semesterMatch[1].toLowerCase() === 'first' ? 'first' : 'second';
                console.log(`تم العثور على الترم: ${semester}`);
                continue;
            }

            // محاولة مطابقة اسم الطالب ورقم الجلوس بنمط مرن
            const studentMatch = cleanedLine.match(/(?:طالب|الطالب|Student):?\s*([^-\n]+?)\s*[-–—]?\s*(?:رقم الجلوس|رقم|ID):?\s*(\d+)/i);
            if (studentMatch) {
                // إذا كان هناك طالب سابق، احفظه
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
                // بدء طالب جديد
                currentStudent = {
                    fullName: studentMatch[1].trim(),
                    id: studentMatch[2].trim()
                };
                grades = [];
                console.log('تم العثور على طالب:', currentStudent);
            } 
            // استخراج المواد والدرجات بنمط مرن
            else if (cleanedLine.includes(':')) {
                const [subject, grade] = cleanedLine.split(':').map(s => s.trim());
                const normalizedSubject = normalizeSubject(subject);
                if (validSubjects.includes(normalizedSubject) && !isNaN(parseInt(grade))) {
                    // التحقق من أن المادة مناسبة للترم
                    if ((normalizedSubject === 'التاريخ' && semester === 'first') || 
                        (normalizedSubject === 'الجغرافيا' && semester === 'second') || 
                        !['التاريخ', 'الجغرافيا'].includes(normalizedSubject)) {
                        grades.push({ name: normalizedSubject, grade: parseInt(grade) });
                        console.log(`تم استخراج المادة: ${normalizedSubject}, الدرجة: ${grade}`);
                    } else {
                        console.log(`تم تجاهل المادة: ${normalizedSubject} (غير مناسبة للترم: ${semester})`);
                        ignoredLines.push(cleanedLine);
                    }
                } else {
                    console.log(`تم تجاهل السطر غير الصالح: ${cleanedLine} (السبب: المادة "${normalizedSubject}" غير موجودة في validSubjects أو الدرجة "${grade}" ليست رقمًا)`);
                    ignoredLines.push(cleanedLine);
                }
            } else {
                console.log(`تم تجاهل السطر غير المنسق: ${cleanedLine} (السبب: لا يحتوي على ":")`);
                ignoredLines.push(cleanedLine);
            }
        }

        // حفظ آخر طالب إذا كان موجودًا
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
            console.error('لم يتم العثور على بيانات طلاب أو درجات صالحة في الأسطر:', lines);
            return res.status(400).json({ 
                error: 'لا توجد بيانات طلاب أو درجات صالحة في الملف',
                details: {
                    extractedLines: lines,
                    ignoredLines: ignoredLines
                }
            });
        }

        res.json({ message: 'تم تحليل PDF بنجاح', results: allResults });
    } catch (error) {
        console.error('خطأ في تحليل PDF:', error.message, error.stack);
        res.status(500).json({ error: 'خطأ في تحليل الملف: ' + error.message });
    }
});
// نقطة نهاية للتحقق من توفر اسم المستخدم
app.post('/api/check-username', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const existingAdmins = await Admin.find({ username });
        const existingStudents = await Student.find({ username });
        const isAvailable = existingAdmins.length === 0 && existingStudents.length === 0;

        res.json({ available: isAvailable });
    } catch (error) {
        console.error('Error checking username:', error.message);
        res.status(500).json({ error: 'Error checking username: ' + error.message });
    }
});
  app.post('/api/analyze-pdf', async (req, res) => {
    try {
        const { pdfData } = req.body;

        // التحقق من وجود pdfData
        if (!pdfData || typeof pdfData !== 'string') {
            console.error('pdfData غير صالح أو مفقود:', pdfData);
            return res.status(400).json({ error: 'بيانات PDF غير صالحة أو مفقودة' });
        }

        // تحويل Base64 إلى Buffer
        let buffer;
        try {
            buffer = Buffer.from(pdfData, 'base64');
        } catch (error) {
            console.error('خطأ في تحويل Base64 إلى Buffer:', error.message);
            return res.status(400).json({ error: 'بيانات Base64 غير صالحة' });
        }

        // تحليل الـ PDF
        const data = await pdfParse(buffer);
        const text = data.text;
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        console.log('الأسطر المستخرجة من الـ PDF:', lines);

        // قائمة المواد المتوقعة
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

        // دالة لتطبيع أسماء المواد
        const normalizeSubject = (subject) => {
            let normalized = subject
                .replace(/اإل/g, 'الإ') // تصحيح "اإل" إلى "الإ"
                .replace(/أ/g, 'ا') // استبدال "أ" بـ "ا"
                .replace(/ی/g, 'ي') // تصحيح "ی" إلى "ي"
                .replace(/ة/g, 'ه') // تصحيح "ة" إلى "ه"
                .replace(/[\/\\]/g, '/') // تطبيع الفواصل
                .replace(/إ/g, 'ا') // استبدال "إ" بـ "ا" إذا لزم
                .replace(/\s+/g, ' ') // إزالة المسافات الزائدة
                .trim();

            // تصحيح يدوي لأسماء المواد المعقدة
            if (normalized.includes('مبادئ') && normalized.includes('تمريض')) {
                return 'مبادئ وأسس تمريض';
            }
            if (normalized.includes('عربيه') || normalized.includes('عربية')) {
                return 'اللغة العربية';
            }
            if (normalized.includes('انجليزيه') || normalized.includes('إنجليزية') || normalized.includes('انجلیزیه')) {
                return 'اللغة الإنجليزية';
            }
            if (normalized.includes('فيزياء') || normalized.includes('فیزیاء')) {
                return 'الفيزياء';
            }
            if (normalized.includes('كيمياء') || normalized.includes('كیمیاء')) {
                return 'الكيمياء';
            }
            if (normalized.includes('تشريح') || normalized.includes('تشریح') || normalized.includes('وظائف')) {
                return 'التشريح/علم وظائف الأعضاء';
            }
            if (normalized.includes('تربيه') || normalized.includes('دينيه') || normalized.includes('دينية')) {
                return 'التربية الدينية';
            }
            if (normalized.includes('كمبيوتر') || normalized.includes('كمبیوتر')) {
                return 'الكمبيوتر';
            }
            if (normalized.includes('تاريخ') || normalized.includes('تاریخ')) {
                return 'التاريخ';
            }
            if (normalized.includes('جغرافيا') || normalized.includes('جغرافیاء')) {
                return 'الجغرافيا';
            }
            return normalized;
        };

        const allResults = [];
        let currentStudent = null;
        let grades = [];
        let semester = 'first'; // القيمة الافتراضية
        const ignoredLines = [];

        for (const line of lines) {
            // تنظيف السطر من المسافات الزائدة
            const cleanedLine = line.trim().replace(/\s+/g, ' ');

            // التحقق من وجود الترم
            const semesterMatch = cleanedLine.match(/(?:الترم|Semester):?\s*(الأول|الثاني|first|second)/i);
            if (semesterMatch) {
                semester = semesterMatch[1].includes('الأول') || semesterMatch[1].toLowerCase() === 'first' ? 'first' : 'second';
                console.log(`تم العثور على الترم: ${semester}`);
                continue;
            }

            // محاولة مطابقة اسم الطالب ورقم الجلوس بنمط مرن
            const studentMatch = cleanedLine.match(/(?:طالب|الطالب|Student):?\s*([^-\n]+?)\s*[-–—]?\s*(?:رقم الجلوس|رقم|ID):?\s*(\d+)/i);
            if (studentMatch) {
                // إذا كان هناك طالب سابق، احفظه
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
                // بدء طالب جديد
                currentStudent = {
                    fullName: studentMatch[1].trim(),
                    id: studentMatch[2].trim()
                };
                grades = [];
                console.log('تم العثور على طالب:', currentStudent);
            } 
            // استخراج المواد والدرجات بنمط مرن
            else if (cleanedLine.includes(':')) {
                const [subject, grade] = cleanedLine.split(':').map(s => s.trim());
                const normalizedSubject = normalizeSubject(subject);
                if (validSubjects.includes(normalizedSubject) && !isNaN(parseInt(grade))) {
                    // التحقق من أن المادة مناسبة للترم
                    if ((normalizedSubject === 'التاريخ' && semester === 'first') || 
                        (normalizedSubject === 'الجغرافيا' && semester === 'second') || 
                        !['التاريخ', 'الجغرافيا'].includes(normalizedSubject)) {
                        grades.push({ name: normalizedSubject, grade: parseInt(grade) });
                        console.log(`تم استخراج المادة: ${normalizedSubject}, الدرجة: ${grade}`);
                    } else {
                        console.log(`تم تجاهل المادة: ${normalizedSubject} (غير مناسبة للترم: ${semester})`);
                        ignoredLines.push(cleanedLine);
                    }
                } else {
                    console.log(`تم تجاهل السطر غير الصالح: ${cleanedLine} (السبب: المادة "${normalizedSubject}" غير موجودة في validSubjects أو الدرجة "${grade}" ليست رقمًا)`);
                    ignoredLines.push(cleanedLine);
                }
            } else {
                console.log(`تم تجاهل السطر غير المنسق: ${cleanedLine} (السبب: لا يحتوي على ":")`);
                ignoredLines.push(cleanedLine);
            }
        }

        // حفظ آخر طالب إذا كان موجودًا
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
            console.error('لم يتم العثور على بيانات طلاب أو درجات صالحة في الأسطر:', lines);
            return res.status(400).json({ 
                error: 'لا توجد بيانات طلاب أو درجات صالحة في الملف',
                details: {
                    extractedLines: lines,
                    ignoredLines: ignoredLines
                }
            });
        }

        res.json({ message: 'تم تحليل PDF بنجاح', results: allResults });
    } catch (error) {
        console.error('خطأ في تحليل PDF:', error.message, error.stack);
        res.status(500).json({ error: 'خطأ في تحليل الملف: ' + error.message });
    }
});              
// نموذج الاختبار
const examSchema = new mongoose.Schema({
    name: { type: String, required: true },
    stage: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    duration: { type: Number, required: true }, // مدة الاختبار بالدقائق
    questions: [{
        type: { type: String, required: true },
        text: { type: String, required: true },
        options: [String],
        correctAnswer: String,
        correctAnswers: [String]
    }]
});
const Exam = mongoose.model('Exam', examSchema);

// نموذج نتائج الاختبار
const examResultSchema = new mongoose.Schema({
    examCode: { type: String, required: true },
    studentId: { type: String, required: true },
    score: { type: Number, required: true },
    completionTime: { type: Date, default: Date.now } // وقت إكمال الاختبار
});
const ExamResult = mongoose.model('ExamResult', examResultSchema);

// التحقق من توفر كود الاختبار
app.post('/api/exams/check-code', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'كود الاختبار مطلوب' });
        }
        const exam = await Exam.findOne({ code });
        res.json({ available: !exam });
    } catch (error) {
        console.error('Error checking exam code:', error);
        res.status(500).json({ error: 'فشل في التحقق من الكود' });
    }
});

// إنشاء اختبار
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
        console.error('Error saving exam:', error);
        if (error.code === 11000) {
            res.status(400).json({ error: 'كود الاختبار مستخدم مسبقًا' });
        } else {
            res.status(500).json({ error: `فشل في حفظ الاختبار: ${error.message}` });
        }
    }
});

// جلب اختبار باستخدام الكود
app.get('/api/exams/:code', async (req, res) => {
    try {
        const code = decodeURIComponent(req.params.code);
        console.log('Fetching exam with code:', code);
        const exam = await Exam.findOne({ code });
        if (!exam) {
            return res.status(404).json({ error: 'الاختبار غير موجود' });
        }
        res.json(exam);
    } catch (error) {
        console.error('Error fetching exam:', error);
        res.status(500).json({ error: `فشل في جلب الاختبار: ${error.message}` });
    }
});

// إرسال نتيجة الاختبار
app.post('/api/exams/submit', async (req, res) => {
    try {
        const { examCode, studentId, score } = req.body;
        const result = new ExamResult({ examCode, studentId, score });
        await result.save();
        res.json({ message: 'تم حفظ النتيجة' });
    } catch (error) {
        console.error('Error submitting exam:', error);
        res.status(500).json({ error: 'فشل في إرسال النتيجة' });
    }
});

// جلب قائمة المستخدمين الذين أكملوا الاختبار
app.get('/api/exams/:code/results', async (req, res) => {
    try {
        const code = decodeURIComponent(req.params.code);
        const results = await ExamResult.find({ examCode: code }).select('studentId score completionTime');
        res.json(results);
    } catch (error) {
        console.error('Error fetching exam results:', error);
        res.status(500).json({ error: `فشل في جلب نتائج الاختبار: ${error.message}` });
    }
});
// نقطة نهاية إنشاء حساب طالب
app.post('/api/register-student', async (req, res) => {
    try {
        const { fullName, username, id, phone, parentName, parentId, password } = req.body;

        // التحقق من الحقول الجديدة فقط
        if (!fullName || !username || !id || !phone || !parentName || !parentId || !password) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }

        // التحقق من رقم الجلوس (1-7 أرقام)
        if (!/^\d{1,7}$/.test(id)) {
            return res.status(400).json({ error: 'رقم الجلوس يجب أن يكون من 1 إلى 7 أرقام فقط' });
        }

        // التحقق من رقم بطاقة ولي الأمر (14 رقم بالظبط)
        if (!/^\d{14}$/.test(parentId)) {
            return res.status(400).json({ error: 'رقم بطاقة ولي الأمر يجب أن يكون 14 رقم بالظبط' });
        }

        // التحقق من صيغة اسم المستخدم
        if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
            return res.status(400).json({ error: 'اسم المستخدم: 3-20 حرف (أحرف وأرقام فقط)' });
        }

        // التحقق من التكرار
        const [existingId, existingUsername, existingParentId] = await Promise.all([
            Student.findOne({ id }).lean(),
            Promise.all([
                Admin.findOne({ username }).lean(),
                Student.findOne({ username }).lean()
            ]),
            Student.findOne({ 'profile.parentId': parentId }).lean()
        ]);

        if (existingId) {
            return res.status(400).json({ error: 'رقم الجلوس مستخدم من قبل' });
        }

        if (existingUsername.some(u => u)) {
            return res.status(400).json({ error: 'اسم المستخدم مستخدم من قبل' });
        }

        if (existingParentId) {
            return res.status(400).json({ error: 'رقم بطاقة ولي الأمر مستخدم من قبل' });
        }

        // تشفير كلمة المرور
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        // إنشاء الطالب (profile يحتوي على الحقول الجديدة فقط)
        const student = new Student({
            fullName,
            id,
            username,
            password: hashedPassword,
            originalPassword: password,
            subjects: [],
            profile: {
                phone,
                parentName,
                parentId
            }
        });

        await student.save();

        console.log(`Student registered: \( {username} ( \){id})`);
        res.json({ message: 'تم إنشاء الحساب بنجاح', username });

    } catch (error) {
        console.error('Error in register-student:', error);
        res.status(500).json({ error: 'خطأ في إنشاء الحساب: ' + error.message });
    }
});
// === مهم جدًا: أضف الـ routes دي في server.js قبل app.listen ===

// تحديث ملف الطالب الشخصي
app.put('/api/students/:username', async (req, res) => {
    try {
        const { profile } = req.body;
        if (!profile) return res.status(400).json({ error: 'البيانات ناقصة' });

        const updated = await Student.findOneAndUpdate(
            { username: req.params.username },
            { $set: { profile } },
            { new: true }
        );

        if (!updated) return res.status(404).json({ error: 'الطالب غير موجود' });

        res.json({ message: 'تم حفظ الملف الشخصي', student: updated });
    } catch (error) {
        console.error('خطأ في تحديث profile الطالب:', error);
        res.status(500).json({ error: 'فشل الحفظ' });
    }
});

// تحديث ملف الأدمن (اختياري لكن خلّيه)
app.put('/api/admins/:username', async (req, res) => {
    try {
        const { profile } = req.body;
        if (!profile) return res.status(400).json({ error: 'البيانات ناقصة' });

        // لو الأدمن مش عنده profile، نضيفه
        const update = profile ? { profile } : {};

        const updated = await Admin.findOneAndUpdate(
            { username: req.params.username },
            { $set: update },
            { new: true, upsert: false }
        );

        if (!updated) return res.status(404).json({ error: 'الأدمن غير موجود' });

        res.json({ message: 'تم حفظ بيانات الأدمن', admin: updated });
    } catch (error) {
        console.error('خطأ في تحديث profile الأدمن:', error);
        res.status(500).json({ error: 'فشل الحفظ' });
    }
});
app.listen(PORT, () => {
    console.log(`الخادم يعمل على http://localhost:${PORT}`);
});





