// auth.js - النسخة المحسنة مع رسائل خطأ مفصلة
document.addEventListener('DOMContentLoaded', function () {

    // تسجيل الدخول
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            // عرض حالة التحميل
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn?.innerHTML || 'تسجيل الدخول';
            if (submitBtn) {
                submitBtn.innerHTML = '⏳ جاري التسجيل...';
                submitBtn.disabled = true;
            }

            if (!username || !password) {
                alert('⚠️ يرجى إدخال اسم المستخدم وكلمة المرور!');
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
                return;
            }

            try {
                console.log('📤 [1/4] جاري إرسال طلب تسجيل الدخول لـ:', username);
                console.log('📤 [1/4] URL:', '/api/login');
                console.log('📤 [1/4] Data:', { username, password: '***' });

                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ username, password })
                });

                console.log('📥 [2/4] HTTP Status:', response.status, response.statusText);
                console.log('📥 [2/4] Headers:', Object.fromEntries(response.headers.entries()));

                // قراءة الرد كـ text أولاً
                const text = await response.text();
                console.log('📥 [2/4] Raw Response Body:', text);

                // محاولة تحويل إلى JSON
                let data;
                try {
                    data = text ? JSON.parse(text) : {};
                    console.log('📥 [2/4] Parsed JSON:', data);
                } catch (parseError) {
                    console.error('❌ [2/4] JSON Parse Error:', parseError);
                    
                    // عرض رسالة خطأ مفصلة حسب نوع الخطأ
                    if (text.includes('A server error has occurred') || text.includes('FUNCTION_INVOCATION_FAILED')) {
                        throw new Error('🚨 السيرفر لا يعمل - تحقق من متغيرات البيئة MONGODB_URI في Vercel');
                    } else if (text.includes('Cannot find module')) {
                        throw new Error('📦 خطأ في التهيئة - مكتبة مفقودة في السيرفر');
                    } else if (text.includes('ECONNREFUSED') || text.includes('MongoNetworkError')) {
                        throw new Error('🗄️ خطأ في الاتصال بقاعدة البيانات - تأكد من رابط MongoDB');
                    } else if (text.includes('404') || text === 'Not Found') {
                        throw new Error('🔍 مسار /api/login غير موجود - تأكد من رفع السيرفر بشكل صحيح');
                    } else if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
                        throw new Error('🌐 السيرفر رد بـ HTML بدلاً من JSON - تحقق من تكوين Vercel');
                    } else if (!text) {
                        throw new Error('📭 السيرفر رد بفارغ - تحقق من logs في Vercel');
                    } else {
                        throw new Error(`❓ خطأ غير متوقع: ${text.substring(0, 200)}`);
                    }
                }

                // معالجة الرد الناجح
                if (response.ok && data.success) {
                    console.log('✅ [3/4] تسجيل دخول ناجح!');
                    
                    const userData = {
                        username: data.user.username,
                        fullName: data.user.fullName,
                        type: data.user.type,
                        ...(data.user.id && { id: data.user.id })
                    };
                    
                    localStorage.setItem('loggedInUser', JSON.stringify(userData));
                    console.log('✅ [3/4] تم حفظ بيانات المستخدم:', userData);
                    
                    alert(`🎉 مرحباً ${data.user.fullName}! (${data.user.type === 'admin' ? 'مدير' : 'طالب'})`);
                    
                    // التوجيه حسب نوع المستخدم
                    if (data.user.type === 'admin') {
                        console.log('🚀 [4/4] التوجيه إلى Admin.html');
                        location.href = 'Admin.html';
                    } else {
                        console.log('🚀 [4/4] التوجيه إلى Home.html');
                        location.href = 'Home.html';
                    }
                    
                } else {
                    console.log('❌ [3/4] فشل تسجيل الدخول - Response OK:', response.ok, 'Success:', data?.success);
                    
                    // رسائل خطأ محددة حسب استجابة السيرفر
                    if (data.error) {
                        if (data.error.includes('بيانات غير صحيحة') || data.error.includes('غير صحيحة')) {
                            alert(`❌ اسم المستخدم أو كلمة المرور غير صحيحة!\n\n💡 تلميح: تأكد من كتابة البيانات بشكل صحيح.`);
                        } else if (data.error.includes('قاعدة البيانات')) {
                            alert(`❌ مشكلة في الاتصال بقاعدة البيانات!\n\n${data.error}\n\n💡 تواصل مع المدير الفني.`);
                        } else {
                            alert(`❌ فشل تسجيل الدخول: ${data.error}`);
                        }
                    } else {
                        alert('❌ اسم المستخدم أو كلمة المرور غير صحيحة!');
                    }
                }

            } catch (err) {
                console.error('🔥 [ERROR] تفاصيل الخطأ الكاملة:', err);
                console.error('🔥 [ERROR] Name:', err.name);
                console.error('🔥 [ERROR] Message:', err.message);
                console.error('🔥 [ERROR] Stack:', err.stack);
                
                // عرض رسالة خطأ واضحة للمستخدم
                let userMessage = '';
                if (err.message.includes('السيرفر لا يعمل')) {
                    userMessage = '⚠️ السيرفر في طور التشغيل، حاول مرة أخرى بعد دقيقة.';
                } else if (err.message.includes('مكتبة مفقودة')) {
                    userMessage = '⚠️ خطأ في تهيئة السيرفر، يرجى إعادة نشر المشروع.';
                } else if (err.message.includes('اتصال بقاعدة البيانات')) {
                    userMessage = '⚠️ مشكلة في الاتصال بقاعدة البيانات، تواصل مع المدير الفني.';
                } else if (err.message.includes('HTML بدلاً من JSON')) {
                    userMessage = '⚠️ خطأ في تكوين Vercel، يرجى التحقق من ملف vercel.json.';
                } else if (err.message.includes('NotFound') || err.message.includes('غير موجود')) {
                    userMessage = '⚠️ مسار تسجيل الدخول غير موجود، يرجى إعادة نشر المشروع.';
                } else {
                    userMessage = `⚠️ فشل الاتصال بالخادم!\n\nالتفاصيل: ${err.message}\n\n💡 تأكد من:\n1. السيرفر يعمل على Vercel\n2. متغير MONGODB_UI مضاف\n3. راجع Vercel Logs لمزيد من التفاصيل`;
                }
                
                alert(userMessage);
                
                // نصائح للمطور في console
                console.log('\n💡 === نصائح للتشخيص ===');
                console.log('1. افتح Vercel Dashboard → مشروعك → Deployments');
                console.log('2. اضغط على آخر deployment');
                console.log('3. اذهب إلى "Functions" لترى logs السيرفر');
                console.log('4. تأكد من وجود MONGODB_URI في Environment Variables');
                console.log('5. جرب رابط /api/test للتحقق من صحة السيرفر');
                console.log('========================\n');
                
            } finally {
                // إعادة زر التحميل
                if (submitBtn) {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // حماية الصفحات
    const currentPage = location.pathname.split('/').pop().toLowerCase();
    console.log('🔐 Checking page access:', currentPage);
    
    const protectedPages = ['home.html', 'admin.html', 'profile.html', 'index.html'];
    if (protectedPages.includes(currentPage)) {
        const userData = localStorage.getItem('loggedInUser');
        const user = userData ? JSON.parse(userData) : null;
        
        console.log('🔐 Current user:', user);
        
        if (!user) {
            console.warn('🔐 No user found - redirecting to login');
            alert('يرجى تسجيل الدخول أولاً!');
            location.href = 'login.html';
            return;
        }

        // التحقق من صلاحيات الوصول
        if (user.type === 'student' && currentPage === 'admin.html') {
            console.warn('🔐 Student trying to access admin page - blocked');
            alert('⛔ غير مصرح لك بالدخول إلى لوحة الإدارة!');
            location.href = 'Home.html';
            return;
        }
        
        console.log('🔐 Access granted for:', user.fullName);
    }
});

// دالة تسجيل الخروج المحسنة
window.logout = function () {
    const user = JSON.parse(localStorage.getItem('loggedInUser') || 'null');
    const userName = user?.fullName || 'المستخدم';
    
    if (confirm(`هل أنت متأكد من تسجيل الخروج، ${userName}؟`)) {
        localStorage.removeItem('loggedInUser');
        console.log('🚪 User logged out');
        alert('👋 تم تسجيل الخروج بنجاح!');
        location.href = 'login.html';
    }
};

// دالة اختبار اتصال السيرفر (يمكنك استدعاؤها من console)
window.testServerConnection = async function() {
    console.log('🧪 Testing server connection...');
    try {
        const response = await fetch('/api/test');
        const text = await response.text();
        console.log('🧪 Response:', text);
        
        try {
            const data = JSON.parse(text);
            console.log('✅ Server is working!');
            console.log('📊 Status:', data);
            alert(`✅ السيرفر يعمل!\n\nMongoDB: ${data.mongodb || 'unknown'}\n${data.message || ''}`);
        } catch(e) {
            console.error('❌ Server returned non-JSON:', text.substring(0, 200));
            alert(`⚠️ السيرفر رد بـ non-JSON:\n${text.substring(0, 200)}`);
        }
    } catch(err) {
        console.error('❌ Cannot reach server:', err);
        alert(`❌ لا يمكن الوصول للسيرفر!\n\n${err.message}`);
    }
};

// عرض معلومات مساعدة في console عند تحميل الصفحة
console.log(`
%c🔐 Auth System Loaded
%c---------------------------------------
%c✓ Version: 2.0 (Enhanced Error Reporting)
%c✓ To test server: testServerConnection()
%c✓ Current page: ${location.pathname}
%c---------------------------------------
`, 'color: green; font-weight: bold', 'color: gray', 'color: blue', 'color: blue', 'color: blue', 'color: gray');
