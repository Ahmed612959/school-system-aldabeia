const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const bcrypt = require('bcryptjs');        // ← تم التعديل إلى bcryptjs
const crypto = require('crypto');

const serverless = require('serverless-http');

const app = express(); 

// ====================== MIDDLEWARE ======================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public')); 

// ====================== ربط MongoDB ======================
const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('❌ MONGODB_URI غير موجود في Environment Variables');
} else {
    console.log('📡 جاري الاتصال بـ MongoDB...');
}

mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
    family: 4
})
.then(() => console.log('✅ تم الاتصال بـ MongoDB بنجاح'))
.catch(err => console.error('❌ فشل الاتصال بـ MongoDB:', err.message));

// ====================== النماذج ======================
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
    profile: {
        phone: String,
        parentName: String,
        parentId: String
    }
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);
const Student = mongoose.model('Student', studentSchema);

// ====================== دوال مساعدة ======================
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

// ====================== Login Route ======================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
        }

        console.log(`🔑 محاولة تسجيل دخول: ${username}`);

        const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
        if (admin) {
            const isMatch = await bcrypt.compare(password, admin.password);
            if (isMatch) {
                return res.json({ success: true, user: { username: admin.username, fullName: admin.fullName, type: 'admin' } });
            }
        }

        const student = await Student.findOne({ username: username.toLowerCase().trim() });
        if (student) {
            const isMatch = await bcrypt.compare(password, student.password);
            if (isMatch) {
                return res.json({ 
                    success: true, 
                    user: { 
                        username: student.username, 
                        fullName: student.fullName, 
                        type: 'student',
                        id: student.studentCode 
                    } 
                });
            }
        }

        return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });

    } catch (error) {
        console.error('🚨 Login Error:', error.message);
        res.status(500).json({ error: 'حدث خطأ داخلي في السيرفر' });
    }
});

// ====================== Register Student ======================
app.post('/api/register-student', async (req, res) => {
    try {
        const { fullName, username, password, studentCode, phone, parentName, parentId } = req.body;

        if (!fullName || !username || !password || !studentCode) {
            return res.status(400).json({ error: 'البيانات غير مكتملة' });
        }

        const hashed = await bcrypt.hash(password, 10);

        const student = new Student({
            fullName,
            username: username.toLowerCase().trim(),
            studentCode,
            password: hashed,
            profile: { phone, parentName, parentId }
        });

        await student.save();
        res.json({ success: true, message: 'تم إنشاء الحساب بنجاح' });

    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
});

// ====================== Test Route ======================
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'السيرفر يعمل بنجاح',
        bcrypt: 'bcryptjs'
    });
});

// باقي الـ routes (يمكنك إضافتها لاحقاً)
app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find();
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في جلب الطلاب' });
    }
});

app.get('/api/admins', async (req, res) => {
    try {
        const admins = await Admin.find();
        res.json(admins);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في جلب الأدمنز' });
    }
});

// Error Handling
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: 'حدث خطأ داخلي في السيرفر' });
});

module.exports.handler = serverless(app);





