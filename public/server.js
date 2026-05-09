const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========== النماذج ==========
const adminSchema = new mongoose.Schema({
    fullName: String,
    username: { type: String, unique: true },
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

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

// ========== تسجيل الدخول ==========
app.post('/api/login', async (req, res) => {
    try {
        console.log('📥 Login:', req.body.username);
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }

        // البحث عن أدمن
        let user = await Admin.findOne({ username: username.toLowerCase() });
        let userType = 'admin';

        // البحث عن طالب
        if (!user) {
            user = await Student.findOne({ username: username.toLowerCase() });
            userType = 'student';
        }

        if (!user) {
            return res.status(401).json({ error: 'بيانات غير صحيحة' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'بيانات غير صحيحة' });
        }

        res.json({
            success: true,
            user: {
                username: user.username,
                fullName: user.fullName,
                type: userType,
                ...(user.studentCode && { id: user.studentCode })
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'خطأ في السيرفر: ' + error.message });
    }
});

// ========== تسجيل طالب جديد ==========
app.post('/api/register-student', async (req, res) => {
    try {
        const { fullName, username, password, studentCode, phone, parentName, parentId } = req.body;

        if (!fullName || !username || !password || !studentCode) {
            return res.status(400).json({ error: 'البيانات ناقصة' });
        }

        // التحقق من التكرار
        const existingUser = await Student.findOne({ $or: [{ username }, { studentCode }] });
        if (existingUser) {
            return res.status(400).json({ error: 'المستخدم أو الكود موجود مسبقاً' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const student = new Student({
            fullName,
            username: username.toLowerCase(),
            studentCode,
            password: hashedPassword,
            profile: { phone, parentName, parentId }
        });

        await student.save();
        res.json({ success: true, message: 'تم التسجيل بنجاح' });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== جلب الطلاب ==========
app.get('/api/students', async (req, res) => {
    try {
        const students = await Student.find().select('-password');
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== اختبار الاتصال ==========
app.get('/api/test', (req, res) => {
    res.json({
        status: 'ok',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        message: 'API is working!'
    });
});

// ========== إنشاء مستخدم تجريبي ==========
app.post('/api/create-test-admin', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const admin = new Admin({
            fullName: 'مدير النظام',
            username: 'admin',
            password: hashedPassword
        });
        
        await admin.save();
        res.json({ message: 'تم إنشاء المدير بنجاح', username: 'admin', password: 'admin123' });
    } catch (error) {
        if (error.code === 11000) {
            res.json({ message: 'المدير موجود مسبقاً', username: 'admin' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// ========== الاتصال بقاعدة البيانات ==========
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://myadmin:MySecurePass123@cluster0.1cou98u.mongodb.net/school_system?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err.message));

// ========== التصدير ==========
module.exports = serverless(app);
