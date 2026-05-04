const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const pdfParse = require('pdf-parse');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const serverless = require('serverless-http');

const app = express();

// ====================== MIDDLEWARE (مهم جداً) ======================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));

app.use(express.static('public'));

// ====================== MongoDB Connection ======================
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is missing!');
    process.exit(1);
}

mongoose.connect(uri)
    .then(() => console.log('تم الاتصال بـ MongoDB'))
    .catch(err => console.error('خطأ في الاتصال:', err));

// ====================== Schemas ======================
const adminSchema = new mongoose.Schema({
    fullName: String,
    username: String,
    password: String
});

const studentSchema = new mongoose.Schema({
    fullName: String,
    studentCode: { 
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

// ====================== Helper Functions ======================
function generateUniqueUsername(fullName, id, existingUsers) {
    let baseUsername = fullName.toLowerCase().replace(/\s+/g, '').slice(0, 10) + id.slice(-2);
    let username = baseUsername;
    let counter = 1;
    while (existingUsers.some(user => user.username === username)) {
        username = `\( {baseUsername} \){counter}`;
        counter++;
    }
    return username;
}

function generatePassword(fullName) {
    const firstName = fullName.split(' ')[0];
    return `${firstName.charAt(0).toUpperCase() + firstName.slice(1)}1234@`;
}

// ====================== Weekly Quiz Schema ======================
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

const WeeklyQuiz = mongoose.model('WeeklyQuiz', weeklyQuizSchema);

// ====================== REGISTER STUDENT - الحل النهائي ======================
// ====================== REGISTER STUDENT - الحل المحسن (JSON) ======================
// ====================== REGISTER STUDENT - الحل النهائي المحدث ======================
app.post('/api/register-student', async (req, res) => {
    try {
        console.log("=== REGISTER STUDENT START ===");
        console.log("📌 Content-Type Received:", req.headers['content-type']);
        console.log("📥 Raw Body Received:", JSON.stringify(req.body, null, 2));
        console.log("📋 Keys in req.body:", Object.keys(req.body || {}));

        // استخراج البيانات
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
            studentCode, 
            phone, 
            parentName, 
            parentId, 
            passwordLength: password.length 
        });

        // التحقق من ملء جميع الحقول
        if (!fullName || !username || !password || !studentCode || !phone || !parentName || !parentId) {
            console.log("❌ Validation Failed - Missing Fields");
            return res.status(400).json({ 
                error: 'جميع الحقول مطلوبة',
                debug: { 
                    fullName: !!fullName, 
                    username: !!username, 
                    password: !!password,
                    studentCode: !!studentCode, 
                    phone: !!phone, 
                    parentName: !!parentName, 
                    parentId: !!parentId,
                    receivedKeys: Object.keys(req.body || {})
                }
            });
        }

        // Validation إضافية
        if (studentCode.length !== 7) {
            return res.status(400).json({ error: 'رقم الجلوس لازم 7 أرقام' });
        }
        
        if (parentId.length !== 14) {
            return res.status(400).json({ error: 'رقم ولي الأمر لازم 14 رقم' });
        }
        
        if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
            return res.status(400).json({ error: 'اسم المستخدم غير صالح' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
        }

        // التحقق من عدم التكرار
        const [existCode, existUser] = await Promise.all([
            Student.findOne({ studentCode }),
            Student.findOne({ username })
        ]);

        if (existCode) {
            return res.status(400).json({ error: 'هذا الكود مستخدم بالفعل' });
        }
        
        if (existUser) {
            return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' });
        }

        // تشفير كلمة المرور
        const hashed = await bcrypt.hash(password, 10);

        // إنشاء الطالب الجديد
        const student = new Student({
            fullName,
            username,
            studentCode,
            password: hashed,
            profile: { 
                phone, 
                parentName, 
                parentId 
            }
        });

        await student.save();

        console.log(`✅ تم إنشاء الطالب بنجاح: ${username} | كود: ${studentCode}`);

        res.json({ 
            success: true,
            message: 'تم إنشاء الحساب بنجاح 🎉',
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

// ====================== باقي الـ Routes (كاملة كما هي) ======================

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

// باقي الروتس (ضع هنا كل الروتس القديمة مثل analyze-pdf, violations, notifications, exams, etc.)

// مثال: 
// app.post('/api/analyze-pdf', async (req, res) => { ... });
// app.post('/api/check-username', async (req, res) => { ... });
// app.post('/api/exams/check-code', ... ) إلخ

// ====================== Profile Routes ======================
app.get('/api/students/:username', async (req, res) => {
    try {
        const student = await Student.findOne({ username: req.params.username });
        if (!student) return res.status(404).json({ error: 'الطالب غير موجود' });
        res.json(student);
    } catch (error) {
        res.status(500).json({ error: 'فشل في جلب البيانات' });
    }
});

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
        res.status(500).json({ error: 'فشل في التحديث' });
    }
});

// ====================== Nour AI ======================
app.post('/api/nour', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt || prompt.toString().trim() === '') {
            return res.json({ reply: "اكتب حاجة الأول يا وحش!" });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();

        if (!GEMINI_API_KEY) {
            return res.json({ reply: "نور نايمة دلوقتي يا بطل…" });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: `أنت نور، مساعد ذكي مصري... السؤال: ${prompt}` }]
                    }],
                    generationConfig: { temperature: 0.9, maxOutputTokens: 1000 }
                })
            }
        );

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "معلش يا وحش…";
        res.json({ reply: reply.replace(/^\*\*|\*\*$/g, "").trim() });

    } catch (err) {
        console.error("خطأ في /api/nour:", err.message);
        res.json({ reply: "النت وقع يا أسطورة… جرب تاني" });
    }
});

// ====================== Vercel Serverless Handler ======================
module.exports.handler = serverless(app);
