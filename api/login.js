module.exports = (req, res) => {
    // السماح لجميع المواقع بالاتصال
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { username, password } = req.body || {};
        
        console.log('Login attempt:', username);
        
        // رد بسيط للاختبار من غير قاعدة بيانات
        if (username === 'admin' && password === 'admin123') {
            return res.json({
                success: true,
                user: {
                    username: 'admin',
                    fullName: 'مدير النظام',
                    type: 'admin'
                }
            });
        }
        
        return res.status(401).json({ error: 'بيانات غير صحيحة' });
        
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
