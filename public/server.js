const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const serverless = require('serverless-http');

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// ================= DB =================
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

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

// REGISTER
app.post('/api/register-student', async (req, res) => {
    try {
        const {
            fullName,
            username,
            phone,
            parentName,
            parentId,
            password,
            year
        } = req.body;

        console.log("REQ BODY:", req.body);

        // ✅ validation الصحيح
        if (
            !fullName?.trim() ||
            !username?.trim() ||
            !phone?.trim() ||
            !parentName?.trim() ||
            !parentId?.trim() ||
            !password ||
            !year
        ) {
            return res.status(400).json({
                error: 'Missing fields',
                debug: req.body
            });
        }

        const exists = await Student.findOne({ username });
        if (exists) {
            return res.status(400).json({ error: 'Username exists' });
        }

        const student = new Student({
            fullName,
            username,
            phone,
            parentName,
            parentId,
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

// UPDATE STUDENT (بدون ID)
app.put('/api/students/:username', async (req, res) => {
    const student = await Student.findOneAndUpdate(
        { username: req.params.username },
        { $set: req.body },
        { new: true }
    );

    res.json(student);
});

// DELETE STUDENT
app.delete('/api/students/:username', async (req, res) => {
    await Student.findOneAndDelete({ username: req.params.username });
    res.json({ success: true });
});

// ================= USERNAME CHECK =================
app.post('/api/check-username', async (req, res) => {
    const { username } = req.body;
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
module.exports.handler = serverless(app);
