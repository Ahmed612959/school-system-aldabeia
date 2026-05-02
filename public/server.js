const express = require('express'); 
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const pdfParse = require('pdf-parse');
const crypto = require('crypto');
const serverless = require('serverless-http');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is missing!');
  process.exit(1);
}

mongoose.connect(uri)
  .then(() => console.log('تم الاتصال بـ MongoDB'))
  .catch(err => console.error('خطأ في الاتصال:', err));


// ===================== SCHEMAS =====================

const adminSchema = new mongoose.Schema({
    fullName: String,
    username: String,
    password: String
});

const studentSchema = new mongoose.Schema({
    fullName: String,
    studentCardId: { type: String, required: true, unique: true },
    username: String,
    password: String,
    originalPassword: String,
    semester: { type: String, enum: ['first', 'second'], default: 'first' },
    subjects: [{ name: String, grade: Number }],
    profile: {
        phone: String,
        parentName: String,
        parentId: String
    }
});

const violationSchema = new mongoose.Schema({
    studentId: String,
    type: String,
    reason: String,
    penalty: String,
    parentSummons: Boolean,
    date: String
});

const notificationSchema = new mongoose.Schema({
    text: String,
    date: String
});

const Admin = mongoose.model('Admin', adminSchema);
const Student = mongoose.model('Student', studentSchema);
const Violation = mongoose.model('Violation', violationSchema);
const Notification = mongoose.model('Notification', notificationSchema);


// ===================== HELPERS =====================

function generateUniqueUsername(fullName, studentCardId, existingUsers) {
    let baseUsername = fullName.toLowerCase().replace(/\s+/g, '').slice(0, 10) + studentCardId.slice(-2);
    let username = baseUsername;
    let counter = 1;

    while (existingUsers.some(user => user.username === username)) {
        username = `${baseUsername}${counter}`;
        counter++;
    }

    return username;
}

function generatePassword(fullName) {
    const firstName = fullName.split(' ')[0];
    return `${firstName.charAt(0).toUpperCase() + firstName.slice(1)}1234@`;
}


// ===================== REGISTER STUDENT (FIXED) =====================

app.post('/api/register-student', async (req, res) => {
    try {
        const { fullName, username, studentCardId, phone, parentName, parentId, password } = req.body;

        // validation
        if (!fullName || !username || !studentCardId || !phone || !parentName || !parentId || !password) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }

        if (!/^\d{14}$/.test(studentCardId)) {
            return res.status(400).json({ error: 'رقم بطاقة الطالب يجب أن يكون 14 رقم' });
        }

        if (!/^\d{14}$/.test(parentId)) {
            return res.status(400).json({ error: 'رقم بطاقة ولي الأمر يجب أن يكون 14 رقم' });
        }

        if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
            return res.status(400).json({ error: 'اسم المستخدم غير صحيح' });
        }

        // check duplicates
        const [existingCard, existingAdmin, existingStudent, existingParent] = await Promise.all([
            Student.findOne({ studentCardId }),
            Admin.findOne({ username }),
            Student.findOne({ username }),
            Student.findOne({ 'profile.parentId': parentId })
        ]);

        if (existingCard) {
            return res.status(400).json({ error: 'رقم بطاقة الطالب مستخدم من قبل' });
        }

        if (existingAdmin || existingStudent) {
            return res.status(400).json({ error: 'اسم المستخدم مستخدم من قبل' });
        }

        if (existingParent) {
            return res.status(400).json({ error: 'رقم بطاقة ولي الأمر مستخدم من قبل' });
        }

        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        const student = new Student({
            fullName,
            studentCardId,
            username,
            password: hashedPassword,
            originalPassword: password,
            subjects: [],
            profile: {
                phone,
                parentName,
                parentId
            }
        });

        await student.save();

        console.log(`Student registered: ${username} (${studentCardId})`);

        res.json({ message: 'تم إنشاء الحساب بنجاح', username });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'خطأ في إنشاء الحساب' });
    }
});


// ===================== STUDENTS =====================

app.get('/api/students', async (req, res) => {
    const students = await Student.find();
    res.json(students);
});


// ❗ FIXED: كان id → studentCardId
app.delete('/api/students/:studentCardId', async (req, res) => {
    try {
        await Student.deleteOne({ studentCardId: req.params.studentCardId });
        await Violation.deleteMany({ studentId: req.params.studentCardId });
        res.json({ message: 'تم حذف الطالب' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في حذف الطالب' });
    }
});


// ===================== ANALYZE PDF (FIXED ONLY ID) =====================

app.post('/api/analyze-pdf', async (req, res) => {
    try {
        const { pdfData } = req.body;

        const buffer = Buffer.from(pdfData, 'base64');
        const data = await pdfParse(buffer);
        const lines = data.text.split(/\r?\n/).filter(l => l.trim());

        let currentStudent = null;
        let grades = [];
        let semester = 'first';

        const allResults = [];

        for (const line of lines) {

            const studentMatch = line.match(/(?:طالب|Student):?\s*(.+?)\s*(?:رقم الجلوس|ID):?\s*(\d+)/i);

            if (studentMatch) {

                if (currentStudent) {
                    allResults.push({
                        name: currentStudent.name,
                        studentCardId: currentStudent.studentCardId,
                        semester,
                        results: grades
                    });

                    let student = await Student.findOne({ studentCardId: currentStudent.studentCardId });

                    if (student) {
                        student.subjects = grades;
                        student.semester = semester;
                        await student.save();
                    } else {
                        await Student.create({
                            fullName: currentStudent.name,
                            studentCardId: currentStudent.studentCardId,
                            username: generateUniqueUsername(currentStudent.name, currentStudent.studentCardId, []),
                            password: crypto.createHash('sha256').update('1234').digest('hex'),
                            originalPassword: '1234',
                            semester,
                            subjects: grades,
                            profile: {}
                        });
                    }
                }

                currentStudent = {
                    name: studentMatch[1],
                    studentCardId: studentMatch[2]
                };

                grades = [];
            }
        }

        res.json({ message: 'تم التحليل', results: allResults });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ===================== CHECK USERNAME =====================

app.post('/api/check-username', async (req, res) => {
    const { username } = req.body;

    const admin = await Admin.findOne({ username });
    const student = await Student.findOne({ username });

    res.json({ available: !admin && !student });
});


// ===================== EXAMS =====================

const examSchema = new mongoose.Schema({
    name: String,
    stage: String,
    code: { type: String, unique: true },
    duration: Number,
    questions: Array
});

const Exam = mongoose.model('Exam', examSchema);


// ===================== SERVERLESS =====================

module.exports.handler = serverless(app);
