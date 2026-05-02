const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// ✅ مهم
app.use(cors());
app.use(express.json());

// ================= DB =================
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ DB Connected'))
    .catch(err => console.log('❌ DB Error', err));

// ================= MODEL =================
const studentSchema = new mongoose.Schema({
    fullName: String,
    username: { type: String, unique: true },
    password: String,
    phone: String,
    parentName: String,
    parentId: String,
    year: String
});

const Student = mongoose.model('Student', studentSchema);

// ================= HASH =================
const hash = (p) =>
    crypto.createHash('sha256').update(p).digest('hex');

// ================= TEST =================
app.get('/api/test', (req, res) => {
    res.json({ ok: true });
});

// ================= REGISTER =================
app.post('/api/register-student', async (req, res) => {
    try {
        console.log("BODY:", req.body);

        const {
            fullName,
            username,
            password,
            phone,
            parentName,
            parentId,
            year
        } = req.body;

        // ✅ تحقق
        if (!fullName || !username || !password || !phone || !parentName || !parentId || !year) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }

        const cleanUsername = username.toLowerCase();

        const exists = await Student.findOne({ username: cleanUsername });
        if (exists) {
            return res.status(400).json({ error: 'اسم المستخدم مستخدم' });
        }

        const student = new Student({
            fullName,
            username: cleanUsername,
            password: hash(password),
            phone,
            parentName,
            parentId,
            year
        });

        await student.save();

        res.json({ message: 'تم التسجيل بنجاح ✅' });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server Error' });
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
