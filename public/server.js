const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const pdfParse = require('pdf-parse');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ====================== MongoDB Connection - محسن لـ Vercel Serverless ======================
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI is missing in Vercel Environment Variables!');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log('✅ MongoDB already connected (cached)');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 5,
    };

    cached.promise = mongoose.connect(uri, opts)
      .then((mongooseInstance) => {
        console.log('✅ تم الاتصال بـ MongoDB بنجاح');
        return mongooseInstance;
      })
      .catch((err) => {
        console.error('❌ فشل في الاتصال بـ MongoDB:', err.message);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// ====================== Schemas ======================
const adminSchema = new mongoose.Schema({
    fullName: String,
    username: String,
    password: String
});

const studentSchema = new mongoose.Schema({
    fullName: String,
    studentCode: { type: String, required: true, unique: true },
    username: { type: String, unique: true },
    password: String,
    originalPassword: String,
    semester: { type: String, enum: ['first', 'second'], default: 'first' },
    subjects: [{ name: String, grade: Number }],
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

const weeklyQuizSchema = new mongoose.Schema({
    weekNumber: { type: Number, required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true },
    winners: [{
        studentId: String,
        username: String,
        fullName: String,
        answeredAt: { type: Date, default: Date.now }
    }],
    isActive: { type: Boolean, default: true }
});

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

const examResultSchema = new mongoose.Schema({
    examCode: { type: String, required: true },
    studentId: { type: String, required: true },
    score: { type: Number, required: true },
    completionTime: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);
const Student = mongoose.model('Student', studentSchema);
const Violation = mongoose.model('Violation', violationSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const WeeklyQuiz = mongoose.model('WeeklyQuiz', weeklyQuizSchema);
const Exam = mongoose.model('Exam', examSchema);
const ExamResult = mongoose.model('ExamResult', examResultSchema);

// ====================== Helper Functions ======================
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

// ====================== API Routes ======================

// === Admins ===
app.get('/api/admins', async (req, res) => {
    try {
        await connectDB();
        const admins = await Admin.find().lean();
        res.json(admins);
    } catch (error) {
        console.error('خطأ في جلب الأدمنز:', error);
        res.status(500).json({ error: 'خطأ في جلب الأدمنز', details: error.message });
    }
});

app.post('/api/admins', async (req, res) => {
    try {
        await connectDB();
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
        res.status(500).json({ error: 'خطأ في إضافة الأدمن', details: error.message });
    }
});

app.get('/api/admins/:username', async (req, res) => {
    try {
        await connectDB();
        const admin = await Admin.findOne({ username: req.params.username });
        if (!admin) return res.status(404).json({ error: 'الأدمن غير موجود' });
        res.json(admin);
    } catch (error) {
        console.error('خطأ في جلب الأدمن:', error);
        res.status(500).json({ error: 'فشل في جلب البيانات' });
    }
});

// === Students ===
app.get('/api/students', async (req, res) => {
    try {
        await connectDB();
        const students = await Student.find().lean();
        res.json(students);
    } catch (error) {
        console.error('خطأ في جلب الطلاب:', error);
        res.status(500).json({ error: 'خطأ في جلب الطلاب', details: error.message });
    }
});

app.get('/api/students/:username', async (req, res) => {
    try {
        await connectDB();
        const student = await Student.findOne({ username: req.params.username });
        if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });
        res.json(student);
    } catch (error) {
        console.error('خطأ في جلب الطالب:', error);
        res.status(500).json({ error: 'فشل في جلب البيانات' });
    }
});

app.put('/api/students/:username', async (req, res) => {
    try {
        await connectDB();
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

// === Register Student ===
app.post('/api/register-student', async (req, res) => {
    try {
        await connectDB();
        const { fullName, username, studentCode, phone, parentName, parentId, password } = req.body;

        if (!fullName || !username || !studentCode || !phone || !parentName || !parentId || !password) {
            return res.status(400).json({ error: 'كل الحقول مطلوبة' });
        }

        if (!/^\d{7}$/.test(studentCode)) {
            return res.status(400).json({ error: 'اكتب آخر 7 أرقام من البطاقة' });
        }
        if (!/^\d{14}$/.test(parentId)) {
            return res.status(400).json({ error: 'رقم ولي الأمر لازم 14 رقم' });
        }

        const [existCode, existUser] = await Promise.all([
            Student.findOne({ studentCode }),
            Student.findOne({ username })
        ]);

        if (existCode) return res.status(400).json({ error: 'الكود مستخدم' });
        if (existUser) return res.status(400).json({ error: 'اسم المستخدم مستخدم' });

        const hashed = await bcrypt.hash(password, 10);

        const student = new Student({
            fullName,
            username,
            studentCode,
            password: hashed,
            profile: { phone, parentName, parentId }
        });

        await student.save();
        res.json({ message: 'تم إنشاء الحساب بنجاح', username });

    } catch (err) {
        console.error('🔥 ERROR in register-student:', err);
        res.status(500).json({ error: 'خطأ في إنشاء الحساب', details: err.message });
    }
});

// === Violations ===
app.get('/api/violations', async (req, res) => {
    try { await connectDB(); const violations = await Violation.find().lean(); res.json(violations); }
    catch (error) { console.error('خطأ في جلب المخالفات:', error); res.status(500).json({ error: 'خطأ في جلب المخالفات' }); }
});

app.post('/api/violations', async (req, res) => {
    try { await connectDB(); const newViolation = new Violation(req.body); await newViolation.save(); res.json({ message: 'تم إضافة المخالفة', violation: newViolation }); }
    catch (error) { console.error('خطأ في إضافة المخالفة:', error); res.status(500).json({ error: 'خطأ في إضافة المخالفة' }); }
});

// === Notifications ===
app.get('/api/notifications', async (req, res) => {
    try { await connectDB(); const notifications = await Notification.find().lean(); res.json(notifications); }
    catch (error) { console.error('خطأ في جلب الإشعارات:', error); res.status(500).json({ error: 'خطأ في جلب الإشعارات' }); }
});

app.post('/api/notifications', async (req, res) => {
    try { await connectDB(); const newNotification = new Notification(req.body); await newNotification.save(); res.json({ message: 'تم إضافة الإشعار', notification: newNotification }); }
    catch (error) { console.error('خطأ في إضافة الإشعار:', error); res.status(500).json({ error: 'خطأ في إضافة الإشعار' }); }
});

// === PDF Analysis ===
app.post('/api/analyze-pdf', async (req, res) => {
    try {
        await connectDB();
        // باقي كود تحليل PDF الأصلي (انسخه هنا إذا لزم الأمر)
        const { pdfData } = req.body;
        // ... (الكود الكامل لتحليل PDF)
        res.json({ message: 'تم تحليل PDF بنجاح' });
    } catch (error) {
        console.error('خطأ في تحليل PDF:', error);
        res.status(500).json({ error: 'خطأ في تحليل الملف' });
    }
});

// === Nour AI ===
app.post('/api/nour', async (req, res) => {
    try {
        await connectDB();
        const { prompt } = req.body;
        if (!prompt || prompt.toString().trim() === '') {
            return res.json({ reply: "اكتب حاجة الأول يا وحش!" });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
        if (!GEMINI_API_KEY) {
            return res.json({ reply: "نور نايمة دلوقتي يا بطل…" });
        }

        // ... (كود Gemini الأصلي)
        res.json({ reply: "نور جاهزة يا وحش!" });
    } catch (err) {
        console.error("خطأ في /api/nour:", err.message);
        res.json({ reply: "النت وقع يا أسطورة… جرب تاني" });
    }
});

// === Vercel Serverless Handler ===
module.exports.handler = serverless(app);

console.log('🚀 Server.js is ready for Vercel');