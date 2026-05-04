const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Model
const Student = mongoose.model('Student', new mongoose.Schema({
    fullName: String,
    username: { type: String, unique: true },
    studentCode: { type: String, unique: true },
    password: String,
    phone: String,
    parentName: String,
    parentId: String
}));

router.post('/', async (req, res) => {
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

        // ✅ validation
        if (!fullName || !username || !password || !studentCode || !phone || !parentName || !parentId) {
            return res.status(400).json({ error: 'كل الحقول مطلوبة' });
        }

        if (!/^\d{7}$/.test(studentCode)) {
            return res.status(400).json({ error: 'الكود لازم 7 أرقام' });
        }

        if (!/^\d{14}$/.test(parentId)) {
            return res.status(400).json({ error: 'رقم ولي الأمر لازم 14 رقم' });
        }

        const exists = await Student.findOne({ username });
        if (exists) {
            return res.status(400).json({ error: 'اسم المستخدم مستخدم' });
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

        res.json({ message: 'تم التسجيل بنجاح' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'خطأ في السيرفر' });
    }
});

module.exports = router;
