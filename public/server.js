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

// ========== نماذج مبسطة للتجربة ==========
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

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

// ========== تسجيل الدخول ==========
app.post('/api/login', async (req, res) => {
    try {
        console.log('📥 Login request received:', req.body);
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
        }

        // محاولة العثور على أدمن
        let user = await Admin.findOne({ username: username.toLowerCase() });
        let userType = 'admin';

        // إذا لم يكن أدمن، ابحث عن طالب
        if (!user) {
            user = await Student.findOne({ username: username.toLowerCase() });
            userType = 'student';
        }

        if (!user) {
            console.log('❌ User not found:', username);
            return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }

        // التحقق من كلمة المرور
        const isMatch = await bcrypt.compare(password, user.password || '');
        
        if (!isMatch) {
            console.log('❌ Password incorrect for:', username);
            return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
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
        res.status(500).json({ error: 'حدث خطأ داخلي في السيرفر: ' + error.message });
    }
});

// ========== اختبار بسيط ==========
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'API is working!',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ========== التعامل مع MongoDB ==========
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
    })
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err.message));
} else {
    console.error('❌ MONGODB_URI not set in environment variables');
}

// ========== التصدير لـ Vercel ==========
module.exports = serverless(app);
