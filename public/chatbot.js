document.addEventListener('DOMContentLoaded', function () {
    console.log('Chatbot JS loaded at', new Date().toLocaleString());

    // جلب العناصر
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.querySelector('.send-btn');
    const chatWindow = document.getElementById('chat-window');
    const languageToggle = document.getElementById('language-toggle');
    const clearBtn = document.querySelector('.clear-btn');

    // فحص وجود العناصر الأساسية
    if (!chatInput || !sendBtn || !chatWindow) {
        console.error('Missing required elements:', { chatInput, sendBtn, chatWindow });
        return;
    }

    // إعدادات المعهد (باقية زي ما هي)
    let currentLanguage = 'ar';
    const instituteContext = {
        name: 'معهد رعاية الضبعية',
        type: 'طبي',
        subjects: ['تمريض', 'تشريح', 'صيدلة'],
        faq: [
            { question: 'ما هي مواعيد التسجيل؟', answer: 'التسجيل مفتوح من يونيو إلى أغسطس.' },
            { question: 'كيف أتحقق من نتيجتي؟', answer: 'ادخل إلى صفحة النتائج واستخدم رقم الجلوس.' }
        ]
    };

    // تحديث الناف بار (باقي زي ما هو)
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const navBar = document.getElementById('nav-bar');
    if (navBar) {
        function renderNav() {
            const navItems = [
                { href: 'index.html', icon: 'fas fa-home', title: currentLanguage === 'ar' ? 'الرئيسية' : 'Home' },
                { href: 'Home.html', icon: 'fas fa-chart-line', title: currentLanguage === 'ar' ? 'النتائج' : 'Results' },
                { href: 'profile.html', icon: 'fas fa-user', title: currentLanguage === 'ar' ? 'الملف الشخصي' : 'Profile' },
                { href: 'chatbot.html', icon: 'fas fa-robot', title: currentLanguage === 'ar' ? 'المساعد الذكي' : 'Smart Assistant' }
            ];
            if (loggedInUser && loggedInUser.type === 'admin') {
                navItems.push({ href: 'admin.html', icon: 'fas fa-cogs', title: currentLanguage === 'ar' ? 'لوحة التحكم' : 'Admin Panel' });
            }
            navBar.innerHTML = navItems.map(item => `
                <a href="${item.href}" class="${item.href.includes('chatbot') ? 'active' : ''}">
                    <i class="${item.icon}" title="${item.title}"></i>
                </a>
            `).join('');
        }
        renderNav();
    }

    // تبديل اللغة
    if (languageToggle) {
        languageToggle.addEventListener('click', () => {
            currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
            languageToggle.textContent = currentLanguage === 'ar' ? 'EN' : 'AR';
            updateUILanguage();
            showToast(currentLanguage === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language switched to English', 'success');
        });
    }

    // تحديث واجهة المستخدم حسب اللغة
    function updateUILanguage() {
        chatInput.placeholder = currentLanguage === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...';
        if (clearBtn) clearBtn.textContent = currentLanguage === 'ar' ? 'مسح' : 'Clear';
        sendBtn.textContent = currentLanguage === 'ar' ? 'إرسال' : 'Send';
        document.querySelector('.chatbot-section h3')?.replaceWith(
            document.createElement('h3').appendChild(document.createTextNode(currentLanguage === 'ar' ? 'اسألني أي سؤال!' : 'Ask me anything!')).parentElement
        );
        if (navBar) renderNav();
    }

    // تنسيق الوقت
    function formatTime() {
        const now = new Date();
        const hours = now.getHours() % 12 || 12;
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const period = now.getHours() >= 12 ? (currentLanguage === 'ar' ? 'م' : 'PM') : (currentLanguage === 'ar' ? 'ص' : 'AM');
        return `${hours}:${minutes} ${period}`;
    }

    // إضافة رسائل
    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `chat-message ${type}-message`;
        div.innerHTML = `${text.replace(/\n/g, '<br>')}<span class="message-time">${formatTime()}</span>`;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function showTyping() {
        const typing = document.createElement('div');
        typing.className = 'chat-message bot-message loading';
        typing.id = 'typing-indicator';
        typing.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        chatWindow.appendChild(typing);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function removeTyping() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }

    // دالة الإرسال (النسخة الآمنة والمصرية الأصلية)
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) {
            showToast(currentLanguage === 'ar' ? 'اكتب حاجة الأول يا قمر!' : 'Type something first!', 'error');
            return;
        }

        addMessage(message, 'user');
        chatInput.value = '';
        showTyping();

        try {
            // إرسال الرسالة للسيرفر (المفتاح مخفي تمامًا)
            const res = await fetch('https://schoolx-five.vercel.app/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: message, lang: currentLanguage })
            });

            removeTyping();

            if (!res.ok) throw new Error();

            const data = await res.json();
            const reply = data.reply || (currentLanguage === 'ar' ? 'معلش، النت ضعيف شوية… جربي تاني' : 'Sorry, connection issue. Try again.');

            addMessage(reply, 'bot');
            showToast(currentLanguage === 'ar' ? 'رديت عليكي يا وحش!' : 'Replied!', 'success');

        } catch (err) {
            removeTyping();
            addMessage(currentLanguage === 'ar' ? 'النت وقع يا معلم… جرب تاني' : 'No internet connection… Try again', 'bot');
            showToast('فشل الاتصال', 'error');
        }
    }

    // الأحداث
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', e => e.key === 'Enter' && sendMessage());

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm(currentLanguage === 'ar' ? 'هتمسح الدردشة كلها؟' : 'Clear all messages?')) {
                chatWindow.innerHTML = '';
                showToast(currentLanguage === 'ar' ? 'تم المسح!' : 'Chat cleared!', 'success');
            }
        });
    }

    // Toastify (باقي زي ما هو)
    function showToast(message, type = 'success') {
        let backgroundColor = '#333';
        if (type === 'success') backgroundColor = 'linear-gradient(135deg, #28a745, #218838)';
        if (type === 'error') backgroundColor = 'linear-gradient(135deg, #dc3545, #c82333)';

        Toastify({
            text: message,
            duration: 4000,
            gravity: 'top',
            position: 'center',
            backgroundColor: backgroundColor,
            stopOnFocus: true,
            style: {
                fontSize: '18px',
                fontFamily: '"Cairo", sans-serif',
                padding: '20px 30px',
                borderRadius: '12px',
                direction: currentLanguage === 'ar' ? 'rtl' : 'ltr',
                textAlign: currentLanguage === 'ar' ? 'right' : 'left',
            }
        }).showToast();
    }

    // رسالة ترحيب
    setTimeout(() => {
        addMessage(currentLanguage === 'ar'
            ? 'أهلاً يا أجمل طالبة في المعهد! ازيك النهاردة؟ عايزة أساعدك في إيه؟'
            : 'Hey there! How can I help you today?', 'bot');
    }, 800);

    console.log('Chatbot initialized successfully - مصري أصلي 100%');
}); 
