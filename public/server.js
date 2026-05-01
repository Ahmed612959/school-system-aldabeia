const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

        // 🔥 حل مشكلة Vercel (قراءة البودي يدوي)
        let body = req.body;

        if (!body || Object.keys(body).length === 0) {
            body = await new Promise((resolve) => {
                let data = '';

                req.on('data', chunk => data += chunk);

                req.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        resolve({});
                    }
                });
            });
        }

        console.log("🔥 FINAL BODY:", body);

        const {
            fullName,
            username,
            password,
            phone,
            parentName,
            parentId,
            year
        } = body;

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

    let body = req.body;

    if (!body || Object.keys(body).length === 0) {
        body = await new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => data += chunk);
            req.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve({});
                }
            });
        });
    }

    const username = body.username?.trim().toLowerCase();

    const exists = await Student.findOne({ username });
    res.json({ available: !exists });
});

// ================= EXPORT =================
module.exports = app;
