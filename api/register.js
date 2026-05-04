const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const uri = process.env.MONGODB_URI;

if (!mongoose.connections[0].readyState) {
    mongoose.connect(uri);
}

const StudentSchema = new mongoose.Schema({
    fullName: String,
    username: { type: String, unique: true },
    studentCode: { type: String, unique: true },
    password: String,
    phone: String,
    parentName: String,
    parentId: String
});

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);

module.exports = async (req, res) => {

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const {
            fullName,
            username,
            password,
            studentCode,
            phone,
            parentName,
            parentId
        } = req.body;

        // ✅ validation بسيط
        if (!fullName || !username || !password || !studentCode || !phone || !parentName || !parentId) {
            return res.status(400).json({ error: 'كل الحقول مطلوبة' });
        }

        if (!/^\d{7}$/.test(studentCode)) {
            return res.status(400).json({ error: 'الكود لازم 7 أرقام' });
        }

        if (!/^\d{14}$/.test(parentId)) {
            return res.status(400).json({ error: 'رقم ولي الأمر غلط' });
        }

        // check duplicate
        const exist = await Student.findOne({
            $or: [{ username }, { studentCode }]
        });

        if (exist) {
            return res.status(400).json({ error: 'المستخدم موجود' });
        }

        const hashed = await bcrypt.hash(password, 10);

        await Student.create({
            fullName,
            username,
            password: hashed,
            studentCode,
            phone,
            parentName,
            parentId
        });

        res.json({ message: 'تم التسجيل' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
};
