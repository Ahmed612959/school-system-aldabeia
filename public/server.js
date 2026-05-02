const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// ✅ مهم جداً لـ Vercel
app.use(cors());
app.use(express.json());

// ================= DB =================
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ DB Error:', err));

// ================= SCHEMA =================
const studentSchema = new mongoose.Schema({
    fullName: String,
    username: { type: String, unique: true },
    password: String,
    originalPassword: String,
    phone: String,
    parentName: String,
    parentId: String,
    year: String,
    subjects: []
});

const Student = mongoose.model('Student', studentSchema);

// ================= HASH =================
const hash = (password) =>
    crypto.createHash('sha256').update(password).digest('hex');

// ================= TEST =================
app.get('/api/test', (req, res) => {
    res.json({ message: "Server working ✅" });
});

// ================= REGISTER =================
app.post('/api/register-student', async (req, res) => {
    try {
        console.log("📥 BODY:", req.body);

        const {
            fullName,
            username,
            password,
            phone,
            parentName,
            parentId,
            year
        } = req.body;

        // ✅ VALIDATION
        if (!fullName || !username || !password || !phone || !parentName || !parentId || !year) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }

        const cleanUsername = username.trim().toLowerCase();

        // ✅ CHECK USER
        const exists = await Student.findOne({ username: cleanUsername });
        if (exists) {
            return res.status(400).json({ error: 'اسم المستخدم موجود' });
        }

        // ✅ SAVE
        const student = new Student({
            fullName: fullName.trim(),
            username: cleanUsername,
            password: hash(password),
            originalPassword: password,
            phone: phone.trim(),
            parentName: parentName.trim(),
            parentId: parentId.trim(),
            year,
            subjects: []
        });

        await student.save();

        res.json({ message: 'تم التسجيل بنجاح ✅' });

    } catch (err) {
        console.error("❌ ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ================= CHECK USERNAME =================
app.post('/api/check-username', async (req, res) => {
    const username = req.body.username?.toLowerCase();

    const exists = await Student.findOne({ username });
    res.json({ available: !exists });
});

// ================= EXPORT =================
module.exports = (req, res) => app(req, res);
