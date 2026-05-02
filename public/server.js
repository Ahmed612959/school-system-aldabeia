const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const serverless = require('serverless-http');
const bcrypt = require('bcrypt');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ================== MongoDB ==================
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI مش موجود');
  process.exit(1);
}

mongoose.connect(uri)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ Mongo Error:', err));

// ================== Schemas ==================
const adminSchema = new mongoose.Schema({
  fullName: String,
  username: { type: String, unique: true },
  password: String
});

const studentSchema = new mongoose.Schema({
  fullName: String,
  id: { type: String, unique: true }, // رقم الجلوس
  username: { type: String, unique: true },
  password: String,
  semester: { type: String, default: 'first' },
  subjects: [{ name: String, grade: Number }],
  profile: {
    phone: String,
    parentName: String,
    parentId: { type: String, unique: true }
  }
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);
const Student = mongoose.model('Student', studentSchema);

// ================== Routes ==================

// 🧠 Register Student (المظبوط 100%)
app.post('/api/register-student', async (req, res) => {
  try {
    // 🚫 منع _id
    delete req.body._id;

    const {
      fullName,
      username,
      id,
      phone,
      parentName,
      parentId,
      password
    } = req.body;

    // ✅ Validation
    if (!fullName || !username || !id || !phone || !parentName || !parentId || !password) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    if (!/^\d{1,7}$/.test(id)) {
      return res.status(400).json({ error: 'رقم الجلوس غير صحيح' });
    }

    if (!/^\d{14}$/.test(parentId)) {
      return res.status(400).json({ error: 'رقم البطاقة لازم 14 رقم' });
    }

    if (!/^[a-zA-Z0-9]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'اسم المستخدم غير صالح' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور ضعيفة' });
    }

    // ⚡ Check duplicates
    const [existingId, existingUsername, existingParent] = await Promise.all([
      Student.findOne({ id }).lean(),
      Promise.all([
        Student.findOne({ username }).lean(),
        Admin.findOne({ username }).lean()
      ]),
      Student.findOne({ 'profile.parentId': parentId }).lean()
    ]);

    if (existingId) {
      return res.status(400).json({ error: 'رقم الجلوس مستخدم' });
    }

    if (existingUsername.some(u => u)) {
      return res.status(400).json({ error: 'اسم المستخدم مستخدم' });
    }

    if (existingParent) {
      return res.status(400).json({ error: 'رقم البطاقة مستخدم' });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create student
    const student = new Student({
      fullName,
      id,
      username,
      password: hashedPassword,
      subjects: [],
      semester: 'first',
      profile: {
        phone,
        parentName,
        parentId
      }
    });

    await student.save();

    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح 🎉',
      user: {
        username,
        fullName
      }
    });

  } catch (error) {
    console.error('❌ Register Error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        error: 'بيانات مكررة (username / id / parentId)'
      });
    }

    res.status(500).json({
      error: 'خطأ في السيرفر',
      details: error.message
    });
  }
});

// 🧪 Test route
app.get('/api/test', (req, res) => {
  res.json({ message: '🚀 Server is working' });
});

// ================== Export ==================
module.exports.handler = serverless(app);
