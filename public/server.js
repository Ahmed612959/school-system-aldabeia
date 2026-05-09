const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

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

// تجنب إعادة تعريف النماذج
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

// ========== الاتصال بقاعدة البيانات (مهم جداً) ==========
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment variables!');
} else {
    console.log('📡 Connecting to MongoDB...');
    mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
    })
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err.message));
}

// ========== API Routes ==========

// Test endpoint - أول حاجة تجربها
app.get('/api/test', (req, res) => {
    res.json({
        status: 'ok',
        mongodb_state: mongoose.connection.readyState,
        mongodb_status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        console.log('📥 Login request:', req.body.username);
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
            console.log('❌ User not found:', username);
            return res.status(401).json({ error: 'بيانات غير صحيحة' });
        }

        // التحقق من كلمة المرور
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            console.log('❌ Password incorrect for:', username);
            return res.status(401).json({ error: 'بيانات غير صحيحة' });
        }

        console.log('✅ Login successful:', username);
        
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
        console.error('🔥 Login error:', error);
        res.status(500).json({ error: 'خطأ في السيرفر: ' + error.message });
    }
});

// Create test admin (مفيد جداً)
app.post('/api/create-test-admin', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const existingAdmin = await Admin.findOne({ username: 'admin' });
        if (existingAdmin) {
            return res.json({ message: 'المدير موجود مسبقاً', username: 'admin', password: 'admin123' });
        }
        
        const admin = new Admin({
            fullName: 'مدير النظام',
            username: 'admin',
            password: hashedPassword
        });
        
        await admin.save();
        res.json({ message: 'تم إنشاء المدير بنجاح', username: 'admin', password: 'admin123' });
    } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ error: error.message });
    }
});

// Register student
app.post('/api/register-student', async (req, res) => {
    try {
        const { fullName, username, password, studentCode, phone, parentName, parentId } = req.body;

        if (!fullName || !username || !password || !studentCode) {
            return res.status(400).json({ error: 'البيانات ناقصة' });
        }

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

// ========== مهم جداً: تصدير الـ app مباشرة لـ Vercel ==========
// لا تستخدم serverless-http، Vercel يتعامل مع express مباشرة
module.exports = app;
