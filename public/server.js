const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const pdfParse = require('pdf-parse');
const crypto = require('crypto');
const serverless = require('serverless-http');
const fileUpload = require('express-fileupload');

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(fileUpload());
app.use(express.static('public'));

// ================= DB =================
const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
}

mongoose.connect(uri)
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
    username: String,
    password: String,
    originalPassword: String,

    year: {
        type: String,
        enum: ['first', 'second', 'third'],
        default: 'first'
    },

    semester: {
        type: String,
        default: 'first'
    },

    subjects: [{ name: String, grade: Number }],

    profile: {
        phone: String,
        parentName: String,
        parentId: String
    }
});

const monthlyResultSchema = new mongoose.Schema({
    studentName: String,
    studentCode: String,
    subject: String,
    grade: Number,
    month: String,
    uploadDate: { type: Date, default: Date.now }
});

const yearSchema = new mongoose.Schema({
    name: String,
    subjects: [String]
});

const notificationSchema = new mongoose.Schema({
    text: String,
    date: String
});

const violationSchema = new mongoose.Schema({
    studentId: String,
    type: String,
    reason: String,
    penalty: String,
    parentSummons: Boolean,
    date: String
});

// ================= MODELS =================
const Admin = mongoose.model('Admin', adminSchema);
const Student = mongoose.model('Student', studentSchema);
const MonthlyResult = mongoose.model('MonthlyResult', monthlyResultSchema);
const Year = mongoose.model('Year', yearSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Violation = mongoose.model('Violation', violationSchema);

// ================= HELPERS =================
function generateUsername(name) {
    return name.toLowerCase().replace(/\s+/g, '').slice(0, 12);
}

function generatePassword(name) {
    const first = name.split(' ')[0];
    return first.charAt(0).toUpperCase() + first.slice(1) + "1234@";
}

// ================= STUDENTS =================
app.get('/api/students', async (req, res) => {
    res.json(await Student.find());
});

app.get('/api/students/:username', async (req, res) => {
    const student = await Student.findOne({ username: req.params.username });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
});

app.post('/api/students', async (req, res) => {
    try {
        const { fullName, year, semester, subjects } = req.body;

        const username = generateUsername(fullName);
        const password = generatePassword(fullName);

        const student = new Student({
            fullName,
            username,
            password: crypto.createHash('sha256').update(password).digest('hex'),
            originalPassword: password,
            year,
            semester,
            subjects: subjects || [],
            profile: {}
        });

        await student.save();
        res.json({ message: 'Student created', student });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= REGISTER =================
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

        if (!fullName || !username || !phone || !parentName || !parentId || !password || !year) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const exists = await Student.findOne({ username });
        if (exists) return res.status(400).json({ error: 'Username exists' });

        const student = new Student({
            fullName,
            username,
            year,
            password: crypto.createHash('sha256').update(password).digest('hex'),
            originalPassword: password,
            subjects: [],
            profile: {
                phone,
                parentName,
                parentId
            }
        });

        await student.save();
        res.json({ message: 'Registered successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= CHECK USERNAME =================
app.post('/api/check-username', async (req, res) => {
    const { username } = req.body;

    const exists = await Student.findOne({ username }) || await Admin.findOne({ username });

    res.json({ available: !exists });
});

// ================= YEARS =================
app.post('/api/years', async (req, res) => {
    const y = new Year(req.body);
    await y.save();
    res.json(y);
});

app.get('/api/years', async (req, res) => {
    res.json(await Year.find());
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

// ================= VIOLATIONS =================
app.post('/api/violations', async (req, res) => {
    const v = new Violation(req.body);
    await v.save();
    res.json(v);
});

// ================= MONTHLY RESULTS =================
app.post('/api/analyze-monthly', async (req, res) => {
    try {
        const file = req.files?.file;
        const { month } = req.body;

        if (!file) return res.status(400).json({ error: 'No file' });

        const pdf = await pdfParse(file.data);
        const lines = pdf.text.split('\n');

        const results = [];

        for (let line of lines) {
            const match = line.match(/(.+):\s*(\d+)/);

            if (match) {
                const data = {
                    studentName: "Unknown",
                    studentCode: "N/A",
                    subject: match[1].trim(),
                    grade: parseInt(match[2]),
                    month
                };

                await MonthlyResult.create(data);
                results.push(data);
            }
        }

        res.json({ success: true, results });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= EXPORT =================
module.exports.handler = serverless(app);
