const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());

// مهم جدًا
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 حل نهائي لقراءة body في Vercel
app.use((req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
        return next();
    }

    let data = '';

    req.on('data', chunk => {
        data += chunk;
    });

    req.on('end', () => {
        if (data) {
            try {
                req.body = JSON.parse(data);
            } catch {
                req.body = {};
            }
        }
        next();
    });
});

// ================= DB =================
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB Error:', err);
        process.exit(1);
    });

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
function hash(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// ================= TEST =================
app.get('/api/test', (req, res) => {
    res.json({ status: 'Server Working ✅' });
});

// ================= REGISTER =================
app.post('/api/register-student', async (req, res) => {
    try {

        const {
            fullName,
            username,
            password,
            phone,
            parentName,
            parentId,
            year
        } = req.body;

        console.log("🔥 BODY:", req.body);

        // ================= VALIDATION =================
        const fields = { fullName, username, password, phone, parentName, parentId, year };

        for (const [key, value] of Object.entries(fields)) {
            if (!value || String(value).trim() === '') {
                return res.status(400).json({
                    error: `Missing field: ${key}`
                });
            }
        }

        const cleanUsername = username.trim().toLowerCase();

        // ================= CHECK USER =================
        const exists = await Student.findOne({ username: cleanUsername });

        if (exists) {
            return res.status(400).json({ error: 'Username exists' });
        }

        // ================= SAVE =================
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

        res.json({
            message: 'Registered successfully ✅',
            student
        });

    } catch (err) {
        console.error("❌ ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ================= USERNAME CHECK =================
app.post('/api/check-username', async (req, res) => {

    const username = req.body.username?.trim().toLowerCase();

    if (!username) {
        return res.json({ available: false });
    }

    const exists = await Student.findOne({ username });

    res.json({ available: !exists });
});

// ================= EXPORT (Vercel) =================
module.exports = app;
