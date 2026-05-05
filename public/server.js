const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');

const app = express();

// ================= Middleware =================
app.use(express.json());

// ================= MongoDB =================
let isConnected = false;

async function connectDB() {
    if (isConnected) return;

    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('MONGODB_URI not found');
    }

    await mongoose.connect(uri);
    isConnected = true;

    console.log('✅ MongoDB Connected');
}

// ================= Schemas =================
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
    semester: { type: String, default: 'first' },
    subjects: [],
    profile: {
        phone: String,
        parentName: String,
        parentId: String
    }
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

// ================= Routes =================

// 🔥 مهم: endpoints مطابقة لـ auth.js

app.get('/api/admins', async (req, res) => {
    try {
        await connectDB();
        const admins = await Admin.find().lean();
        res.json(admins);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في جلب الأدمنز' });
    }
});

app.get('/api/students', async (req, res) => {
    try {
        await connectDB();
        const students = await Student.find().lean();
        res.json(students);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في جلب الطلاب' });
    }
});

// ================= إضافة بيانات (اختياري) =================

function hash(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// إنشاء أدمن
app.post('/api/admins', async (req, res) => {
    try {
        await connectDB();

        const { fullName, username, password } = req.body;

        const exists = await Admin.findOne({ username });
        if (exists) {
            return res.status(400).json({ error: 'اسم المستخدم موجود' });
        }

        const admin = new Admin({
            fullName,
            username,
            password: hash(password)
        });

        await admin.save();

        res.json({ message: 'تم إنشاء الأدمن' });
    } catch (err) {
        res.status(500).json({ error: 'خطأ في إنشاء الأدمن' });
    }
});

// إنشاء طالب
app.post('/api/students', async (req, res) => {
    try {
        await connectDB();

        const { fullName, username, id, password } = req.body;

        const exists = await Student.findOne({ username });
        if (exists) {
            return res.status(400).json({ error: 'اسم المستخدم مستخدم' });
        }

        const student = new Student({
            fullName,
            username,
            id,
            password: hash(password),
            originalPassword: password
        });

        await student.save();

        res.json({ message: 'تم إنشاء الطالب' });
    } catch (err) {
        res.status(500).json({ error: 'خطأ في إنشاء الطالب' });
    }
});

// ================= Health =================
app.get('/', (req, res) => {
    res.send('API running 🚀');
});

// ================= Export =================
module.exports = app;