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
        const buffer = Buffer.from(pdfData, 'base64');
        const data = await pdfParse(buffer);
        const text = data.text;

        const studentMatch = text.match(/طالب:\s*([^-\n]+?)\s*-\s*رقم الجلوس:\s*(\d+)/gi);
        if (!studentMatch) {
            return res.status(400).json({ error: 'لا توجد بيانات طلاب في الملف' });
        }

        const allResults = [];
        for (const match of studentMatch) {
            const [, name, id] = match.match(/طالب:\s*([^-\n]+?)\s*-\s*رقم الجلوس:\s*(\d+)/i);
            const gradesMatch = text.match(/(\w+\s*\w*):\s*(\d+)/gi) || [];
            const grades = gradesMatch.map(g => {
                const [subject, grade] = g.split(':').map(s => s.trim());
                return { name: subject, grade: parseInt(grade) || 0 };
            });

            const existingAdmins = await Admin.find();
            const existingStudents = await Student.find();
            let student = await Student.findOne({ id });
            if (student) {
                student.subjects = grades;
                await student.save();
            } else {
                const username = generateUniqueUsername(name, id, [...existingAdmins, ...existingStudents]);
                const originalPassword = generatePassword(name);
                const hashedPassword = crypto.createHash('sha256').update(originalPassword).digest('hex');
                student = new Student({
                    fullName: name,
                    id,
                    username,
                    password: hashedPassword,
                    originalPassword,
                    subjects: grades,
                    profile: { email: '', phone: '', birthdate: '', address: '', bio: '' }
                });
                await student.save();
            }
            allResults.push({ name, id, results: Object.fromEntries(grades.map(g => [g.name, g.grade])) });
        }
        res.json({ message: 'تم تحليل PDF بنجاح', results: allResults });
    } catch (error) {
        console.error('خطأ في تحليل PDF:', error);
        res.status(500).json({ error: 'خطأ في تحليل الملف' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`الخادم يعمل على http://localhost:${PORT}`);
});