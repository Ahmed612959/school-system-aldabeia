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

// ================= REGISTER STUDENT =================
app.post('/api/register-student', async (req, res) => {
    try {
        const body = req.body || {};

        console.log("🔥 REGISTER BODY:", body);

        const {
            fullName,
            username,
            phone,
            parentName,
            parentId,
            password,
            year
        } = body;

        const missing = [];

        if (!fullName) missing.push("fullName");
        if (!username) missing.push("username");
        if (!phone) missing.push("phone");
        if (!parentName) missing.push("parentName");
        if (!parentId) missing.push("parentId");
        if (!password) missing.push("password");
        if (!year) missing.push("year");

        if (missing.length > 0) {
            return res.status(400).json({
                error: "جميع الحقول مطلوبة",
                missing
            });
        }

        const cleanUsername = username.trim().toLowerCase();

        const exists = await Student.findOne({ username: cleanUsername });
        if (exists) {
            return res.status(400).json({ error: "اسم المستخدم مستخدم بالفعل" });
        }

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

        return res.json({
            message: "Registered successfully",
            student
        });

    } catch (err) {
        console.error("❌ REGISTER ERROR:", err);
        return res.status(500).json({
            error: err.message
        });
    }
});

// ================= CHECK USERNAME =================
app.post('/api/check-username', async (req, res) => {
    try {
        const username = req.body.username?.trim().toLowerCase();

        if (!username) {
            return res.status(400).json({ error: "username required" });
        }

        const exists = await Student.findOne({ username });

        res.json({ available: !exists });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= GET STUDENTS =================
app.get('/api/students', async (req, res) => {
    const data = await Student.find();
    res.json(data);
});

// ================= GET ONE STUDENT =================
app.get('/api/students/:username', async (req, res) => {
    const student = await Student.findOne({ username: req.params.username });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
});

// ================= UPDATE STUDENT =================
app.put('/api/students/:username', async (req, res) => {
    try {
        const allowed = ['fullName', 'phone', 'parentName', 'parentId', 'year', 'semester', 'subjects'];

        const update = {};

        allowed.forEach(f => {
            if (req.body[f] !== undefined) {
                update[f] = req.body[f];
            }
        });

        const student = await Student.findOneAndUpdate(
            { username: req.params.username },
            { $set: update },
            { new: true }
        );

        res.json(student);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= DELETE STUDENT =================
app.delete('/api/students/:username', async (req, res) => {
    await Student.findOneAndDelete({ username: req.params.username });
    res.json({ success: true });
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
