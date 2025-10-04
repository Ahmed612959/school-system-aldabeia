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
        const { fullName, id, subjects } = req.body;
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
        await Student.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
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
            'الكمبيوتر'
        ];

        // دالة لتطبيع أسماء المواد
        const normalizeSubject = (subject) => {
            return subject
                .replace(/اإل/g, 'الإ') // تصحيح "اإل" إلى "الإ"
                .replace(/أ/g, 'ا') // استبدال "أ" بـ "ا"
                .replace(/ی/g, 'ي') // تصحيح "ی" إلى "ي"
                .replace(/ة/g, 'ه') // تصحيح "ة" إلى "ه" إذا لزم الأمر
                .replace(/\s+/g, ' ') // إزالة المسافات الزائدة
                .trim();
        };

        const allResults = [];
        let currentStudent = null;
        let grades = [];
        const ignoredLines = [];

        for (const line of lines) {
            // تنظيف السطر من المسافات الزائدة
            const cleanedLine = line.trim().replace(/\s+/g, ' ');

            // محاولة مطابقة اسم الطالب ورقم الجلوس بنمط مرن
            const studentMatch = cleanedLine.match(/(?:طالب|الطالب|Student):?\s*([^-\n]+?)\s*[-–—]?\s*(?:رقم الجلوس|رقم|ID):?\s*(\d+)/i);
            if (studentMatch) {
                // إذا كان هناك طالب سابق، احفظه
                if (currentStudent && grades.length > 0) {
                    allResults.push({
                        name: currentStudent.fullName,
                        id: currentStudent.id,
                        results: Object.fromEntries(grades.map(g => [g.name, g.grade]))
                    });
                    const existingAdmins = await Admin.find();
                    const existingStudents = await Student.find();
                    let student = await Student.findOne({ id: currentStudent.id });
                    if (student) {
                        student.subjects = grades;
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
                    grades.push({ name: normalizedSubject, grade: parseInt(grade) });
                    console.log(`تم استخراج المادة: ${normalizedSubject}, الدرجة: ${grade}`);
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
                results: Object.fromEntries(grades.map(g => [g.name, g.grade]))
            });
            const existingAdmins = await Admin.find();
            const existingStudents = await Student.find();
            let student = await Student.findOne({ id: currentStudent.id });
            if (student) {
                student.subjects = grades;
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
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

// نقطة نهاية إنشاء حساب طالب
app.post('/api/register-student', async (req, res) => {
    try {
        const { fullName, username, id, email, phone, birthdate, address, password } = req.body;

        if (!fullName || !username || !id || !email || !phone || !birthdate || !address || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // التحقق من صيغة كود الطالب (STU + 3 أرقام)
        if (!/^STU\d{3}$/.test(id)) {
            return res.status(400).json({ error: 'Student code must be in the format STU followed by 3 digits' });
        }

        // التحقق من صيغة اسم المستخدم
        if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
            return res.status(400).json({ error: 'Username must be 3-20 characters (letters and numbers only)' });
        }

        const existingAdmins = await Admin.find();
        const existingStudents = await Student.find();
        const allUsers = [...existingAdmins, ...existingStudents];

        // التحقق من وجود كود الطالب
        if (allUsers.some(user => user.id === id)) {
            return res.status(400).json({ error: 'Student code already used' });
        }

        // التحقق من وجود اسم المستخدم
        if (allUsers.some(user => user.username === username)) {
            return res.status(400).json({ error: 'Username already used' });
        }

        // التحقق من وجود البريد الإلكتروني
        if (allUsers.some(user => user.profile && user.profile.email === email)) {
            return res.status(400).json({ error: 'Email already used' });
        }

        // تشفير كلمة المرور
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        // إنشاء حساب طالب جديد
        const student = new Student({
            fullName,
            id,
            username,
            password: hashedPassword,
            originalPassword: password, // اختياري
            subjects: [],
            profile: {
                email,
                phone,
                birthdate,
                address,
                bio: ''
            }
        });

        await student.save();
        res.json({ 
            message: 'Student account created successfully',
            username
        });
    } catch (error) {
        console.error('Error creating student account:', error.message);
        res.status(500).json({ error: 'Error creating account: ' + error.message });
    }
});
app.listen(PORT, () => {
    console.log(`الخادم يعمل على http://localhost:${PORT}`);
});





