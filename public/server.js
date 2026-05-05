const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();

// ====================== Middleware ======================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static('public'));

// ====================== MongoDB Connection (مباشر دلوقتي) ======================
const MONGODB_URI = "mongodb+srv://myadmin:MySecurePass123@cluster0.1cou98u.mongodb.net/adminDB?retryWrites=true&w=majority";

console.log("جاري الاتصال بـ MongoDB...");

mongoose.connect(MONGODB_URI, {
    // خيارات مفيدة للسيرفرلس
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
})
.then(() => {
    console.log("✅ تم الاتصال بـ MongoDB بنجاح!");
})
.catch((err) => {
    console.error("❌ فشل الاتصال بـ MongoDB:", err.message);
});

// ====================== Schema بسيط للطالب (مؤقت) ======================
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

const Student = mongoose.model('Student', studentSchema);

// ====================== Route إنشاء الطالب (مباشر) ======================
app.post('/api/register-student', async (req, res) => {
    try {
        const { fullName, username, password, studentCode, phone, parentName, parentId } = req.body;

        if (!fullName || !username || !password || !studentCode || !phone || !parentName || !parentId) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }

        // تنظيف سريع
        const cleanStudentCode = studentCode.toString().trim().replace(/\D/g, '');
        const cleanParentId = parentId.toString().trim().replace(/\D/g, '');

        if (cleanStudentCode.length !== 7) return res.status(400).json({ error: 'رقم الجلوس لازم 7 أرقام' });
        if (cleanParentId.length !== 14) return res.status(400).json({ error: 'رقم ولي الأمر لازم 14 رقم' });

        // التحقق من التكرار
        const exist = await Student.findOne({ $or: [{ studentCode: cleanStudentCode }, { username }] });
        if (exist) {
            return res.status(400).json({ error: 'الكود أو اسم المستخدم مستخدم بالفعل' });
        }

        const hashedPassword = await require('bcrypt').hash(password, 10);

        const newStudent = new Student({
            fullName: fullName.trim(),
            username: username.toLowerCase().trim(),
            password: hashedPassword,
            studentCode: cleanStudentCode,
            profile: { phone, parentName, parentId: cleanParentId }
        });

        await newStudent.save();

        console.log(`✅ تم إنشاء طالب جديد: ${username}`);

        res.json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح 🎉',
            username
        });

    } catch (err) {
        console.error("خطأ في التسجيل:", err);
        res.status(500).json({ error: 'حدث خطأ في السيرفر' });
    }
});

// ====================== Serverless Handler ======================
module.exports.handler = serverless(app);

console.log("🚀 السيرفر جاهز...");