const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const serverless = require('serverless-http');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ====================== MongoDB Connection مع تصحيح قوي ======================
const uri = process.env.MONGODB_URI;

console.log('MONGODB_URI موجود؟:', !!uri); // مهم للتصحيح

if (!uri) {
  console.error('❌ MONGODB_URI غير موجود في Environment Variables!');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log('✅ MongoDB متصل (من الـ Cache)');
    return cached.conn;
  }

  try {
    console.log('⏳ جاري الاتصال بـ MongoDB...');
    
    const opts = {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 60000,
    };

    cached.promise = mongoose.connect(uri, opts);
    const mongooseInstance = await cached.promise;

    console.log('✅ تم الاتصال بـ MongoDB بنجاح!');
    cached.conn = mongooseInstance;
    return mongooseInstance;

  } catch (err) {
    console.error('❌ فشل الاتصال بـ MongoDB:');
    console.error('   الرسالة:', err.message);
    console.error('   السبب:', err.reason || 'غير معروف');
    throw err;   // مهم عشان يرجع 500 مع تفاصيل
  }
}

// ====================== Schemas ======================
const adminSchema = new mongoose.Schema({ fullName: String, username: String, password: String });
const studentSchema = new mongoose.Schema({
    fullName: String,
    id: String,
    username: String,
    password: String,
    originalPassword: String,
    year: { type: String, enum: ['first', 'second'], default: 'first' },
    semester: { type: String, enum: ['first', 'second'], default: 'first' },
    subjects: [{ name: String, grade: Number }],
    profile: { phone: String, parentName: String, parentId: String }
});

const Admin = mongoose.model('Admin', adminSchema);
const Student = mongoose.model('Student', studentSchema);

// ====================== Routes مع تصحيح ======================

app.get('/api/admins', async (req, res) => {
    try {
        console.log('طلب /api/admins');
        await connectDB();
        const admins = await Admin.find().lean();
        console.log(`تم جلب ${admins.length} أدمن`);
        res.json(admins);
    } catch (error) {
        console.error('خطأ في /api/admins:', error.message);
        res.status(500).json({ 
            error: 'خطأ في جلب الأدمنز', 
            details: error.message,
            isMongoError: error.name.includes('Mongo')
        });
    }
});

app.get('/api/students', async (req, res) => {
    try {
        console.log('طلب /api/students');
        await connectDB();
        const students = await Student.find().lean();
        console.log(`تم جلب ${students.length} طالب`);
        res.json(students);
    } catch (error) {
        console.error('خطأ في /api/students:', error.message);
        res.status(500).json({ 
            error: 'خطأ في جلب الطلاب', 
            details: error.message,
            isMongoError: error.name.includes('Mongo')
        });
    }
});

// Route بسيطة لاختبار الاتصال
app.get('/api/test-db', async (req, res) => {
    try {
        await connectDB();
        res.json({ status: 'success', message: 'الاتصال بـ MongoDB شغال' });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: 'فشل الاتصال بـ MongoDB',
            details: error.message 
        });
    }
});

// Vercel Handler
module.exports.handler = serverless(app);

console.log('🚀 Server started - Debug Mode');