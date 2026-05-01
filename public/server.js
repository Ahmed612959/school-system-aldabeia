const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');


const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= DB =================
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });

// ================= SCHEMAS =================
const adminSchema = new mongoose.Schema({
    fullName: String,
    username: String,
    password: String
});

const studentSchema = new mongoose.Schema({
    fullName: String,
    username: { type: String, unique: true },
    password: String,
    originalPassword: String,

    phone: String,
    parentName: String,
    parentId: String,

    year: String,
    semester: String,

    subjects: [
        {
            name: String,
            grade: Number
        }
    ]
});

const notificationSchema = new mongoose.Schema({
    text: String,
    date: String
});

const violationSchema = new mongoose.Schema({
    studentUsername: String,
    type: String,
    reason: String,
    penalty: String,
    parentSummons: Boolean,
    date: String
});

// ================= MODELS =================
const Admin = mongoose.model('Admin', adminSchema);
const Student = mongoose.model('Student', studentSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Violation = mongoose.model('Violation', violationSchema);

// ================= HELPERS =================
function hash(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// ================= STUDENTS =================

// GET ALL
app.get('/api/students', async (req, res) => {
    const data = await Student.find();
    res.json(data);
});

// GET ONE
app.get('/api/students/:username', async (req, res) => {
    const student = await Student.findOne({ username: req.params.username });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
});

// ================= REGISTER =================

app.post('/api/register-student', async (req, res) => {
    try {

        // 🔥 الحل الحقيقي لمشكلة Vercel
        let body = req.body;

        if (!body || Object.keys(body).length === 0) {
            // نحاول نقرأ body يدوي
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
            phone,
            parentName,
            parentId,
            password,
            year
        } = body;

        // ================= VALIDATION =================
        const requiredFields = {
            fullName,
            username,
            phone,
            parentName,
            parentId,
            password,
            year
        };

        for (const [key, value] of Object.entries(requiredFields)) {
            if (value === undefined || value === null || String(value).trim() === "") {
                return res.status(400).json({
                    error: `Missing field: ${key}`,
                    debug: body
                });
            }
        }

        // ================= CLEAN USERNAME =================
        const cleanUsername = username.trim().toLowerCase();

        const exists = await Student.findOne({ username: cleanUsername });
        if (exists) {
            return res.status(400).json({ error: 'Username exists' });
        }

        // ================= CREATE STUDENT =================
        const student = new Student({
            fullName: fullName.trim(),
            username: cleanUsername,
            phone: phone.trim(),
            parentName: parentName.trim(),
            parentId: parentId.trim(),
            year,
            password: hash(password),
            originalPassword: password,
            subjects: []
        });

        await student.save();

        res.json({
            message: 'Registered successfully',
            student
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});
        

// ================= UPDATE STUDENT (SAFE) =================
app.put('/api/students/:username', async (req, res) => {
    try {
        const allowedFields = [
            'fullName',
            'phone',
            'parentName',
            'parentId',
            'year',
            'semester',
            'subjects'
        ];

        const updateData = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        const student = await Student.findOneAndUpdate(
            { username: req.params.username },
            { $set: updateData },
            { new: true }
        );

        res.json(student);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= DELETE =================
app.delete('/api/students/:username', async (req, res) => {
    await Student.findOneAndDelete({ username: req.params.username });
    res.json({ success: true });
});

// ================= USERNAME CHECK =================
app.post('/api/check-username', async (req, res) => {
    const username = req.body.username?.trim().toLowerCase();
    const exists = await Student.findOne({ username });
    res.json({ available: !exists });
});

// ================= ADMIN =================
app.post('/api/admins', async (req, res) => {
    const admin = new Admin(req.body);
    await admin.save();
    res.json(admin);
});

app.get('/api/admins', async (req, res) => {
    res.json(await Admin.find());
});

app.delete('/api/admins/:username', async (req, res) => {
    await Admin.findOneAndDelete({ username: req.params.username });
    res.json({ success: true });
});

// ================= NOTIFICATIONS =================
app.post('/api/notifications', async (req, res) => {
    const n = new Notification(req.body);
    await n.save();
    res.json(n);
});

app.get('/api/notifications', async (req, res) => {
    res.json(await Notification.find());
});

app.delete('/api/notifications/:id', async (req, res) => {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// ================= VIOLATIONS =================
app.post('/api/violations', async (req, res) => {
    const v = new Violation(req.body);
    await v.save();
    res.json(v);
});

app.get('/api/violations', async (req, res) => {
    res.json(await Violation.find());
});

app.delete('/api/violations/:id', async (req, res) => {
    await Violation.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// ================= EXPORT =================
module.exports = app;
