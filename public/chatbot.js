document.addEventListener('DOMContentLoaded', function() {
    console.log('Chatbot JS loaded at', new Date().toLocaleString());

    // جلب العناصر
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.querySelector('.send-btn');
    const chatWindow = document.getElementById('chat-window');
    const languageToggle = document.getElementById('language-toggle');
    console.log('Chat elements:', { chatInput: !!chatInput, sendBtn: !!sendBtn, chatWindow: !!chatWindow, languageToggle: !!languageToggle });

    // فحص وجود العناصر
    if (!chatInput || !sendBtn || !chatWindow) {
        console.error('Missing required elements:', { chatInput, sendBtn, chatWindow });
        showToast('خطأ: حقل الإدخال أو زر الإرسال أو نافذة الدردشة غير موجودة!', 'error');
        return;
    }

    // مفتاح API وتهيئة
    const API_KEY = 'AIzaSyB_BhSZ-xN5oCJlJfVvu_zr7bSl_Wi6VIA'; // استبدل بمفتاحك
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    let currentLanguage = 'ar'; // اللغة الافتراضية: العربية
    const instituteContext = {
        name: 'معهد رعاية الضبعية',
        type: 'طبي',
        subjects: ['تمريض', 'تشريح', 'صيدلة'],
        faq: [
            { question: 'ما هي مواعيد التسجيل؟', answer: 'التسجيل مفتوح من يونيو إلى أغسطس.' },
            { question: 'كيف أتحقق من نتيجتي؟', answer: 'ادخل إلى صفحة النتائج واستخدم رقم الجلوس.' }
        ]
    };

    // تحديث الناف بار
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const navBar = document.getElementById('nav-bar');
    if (navBar) {
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
            <a href="${item.href}" class="${item.href === 'chatbot.html' ? 'active' : ''}">
                <i class="${item.icon}" title="${item.title}"></i>
            </a>
        `).join('');
        console.log('Nav bar updated with items:', navItems);

        // التحقق من تحميل الأيقونات
        setTimeout(() => {
            const icon = document.querySelector('.nav-bar a i');
            if (!icon || getComputedStyle(icon).fontFamily.indexOf('Font Awesome') === -1) {
                console.error('Font Awesome icons not rendered');
                showToast(currentLanguage === 'ar' ? 'خطأ: فشل تحميل أيقونات الناف بار! تأكد من وجود ملفات Font Awesome في المسار css/fontawesome.' : 'Error: Failed to load nav bar icons! Ensure Font Awesome files are in css/fontawesome.', 'error');
            } else {
                console.log('Font Awesome icons rendered successfully');
            }
        }, 2000);
    } else {
        console.error('Nav bar element not found');
        showToast(currentLanguage === 'ar' ? 'خطأ: الناف بار غير موجود!' : 'Error: Nav bar not found!', 'error');
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
        document.getElementById('chat-input').placeholder = currentLanguage === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...';
        document.querySelector('.clear-btn').textContent = currentLanguage === 'ar' ? 'مسح' : 'Clear';
        document.querySelector('.send-btn').textContent = currentLanguage === 'ar' ? 'إرسال' : 'Send';
        document.querySelector('.chatbot-section h3').textContent = currentLanguage === 'ar' ? 'اسألني أي سؤال!' : 'Ask me anything!';
        // تحديث الناف بار
        const navItems = [
            { href: 'index.html', icon: 'fas fa-home', title: currentLanguage === 'ar' ? 'الرئيسية' : 'Home' },
            { href: 'home.html', icon: 'fas fa-chart-line', title: currentLanguage === 'ar' ? 'النتائج' : 'Results' },
            { href: 'profile.html', icon: 'fas fa-user', title: currentLanguage === 'ar' ? 'الملف الشخصي' : 'Profile' },
            { href: 'chatbot.html', icon: 'fas fa-robot', title: currentLanguage === 'ar' ? 'المساعد الذكي' : 'Smart Assistant' }
        ];
        if (loggedInUser && loggedInUser.type === 'admin') {
            navItems.push({ href: 'admin.html', icon: 'fas fa-cogs', title: currentLanguage === 'ar' ? 'لوحة التحكم' : 'Admin Panel' });
        }
        navBar.innerHTML = navItems.map(item => `
            <a href="${item.href}" class="${item.href === 'chatbot.html' ? 'active' : ''}">
                <i class="${item.icon}" title="${item.title}"></i>
            </a>
        `).join('');
    }

    // دالة تنسيق الوقت
    function formatTime() {
        const now = new Date();
        const hours = now.getHours() % 12 || 12;
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const period = now.getHours() >= 12 ? (currentLanguage === 'ar' ? 'م' : 'PM') : (currentLanguage === 'ar' ? 'ص' : 'AM');
        return `${hours}:${minutes} ${period}`;
    }

    // دالة تنسيق الرد
    function formatAnswer(text) {
        if (!text) return currentLanguage === 'ar' ? 'معلش، حصل خطأ! جرب تاني.' : 'Sorry, something went wrong! Try again.';
        let formatted = text
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/(\d+\.\s+)([^\n]+)/g, '<li>$2</li>')
            .replace(/(\<li\>.*\<\/li\>)/s, '<ul>$1</ul>');
        return `<p>${formatted}</p>`;
    }

    // إضافة أحداث الإرسال
    sendBtn.addEventListener('click', function() {
        console.log('Send button clicked');
        sendMessage();
    });

    chatInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            console.log('Enter key pressed');
            sendMessage();
        }
    });

    // دالة إرسال الرسالة
    async function sendMessage() {
        console.log('sendMessage called, input value:', chatInput.value);
        try {
            const message = chatInput.value.trim();
            if (!message) {
                showToast(currentLanguage === 'ar' ? 'اكتب سؤال أولًا!' : 'Type a question first!', 'error');
                return;
            }

            // إضافة مؤشر التحميل
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'chat-message bot-message loading';
            loadingIndicator.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
            chatWindow.appendChild(loadingIndicator);
            chatWindow.scrollTop = chatWindow.scrollHeight;

            // إضافة رسالة المستخدم
            const userMessage = document.createElement('div');
            userMessage.className = 'chat-message user-message';
            userMessage.innerHTML = `${message}<span class="message-time">${formatTime()}</span>`;
            chatWindow.appendChild(userMessage);
            chatInput.value = '';
            chatWindow.scrollTop = chatWindow.scrollHeight;

            // التحقق من الأسئلة الشائعة أولاً
            const faqAnswer = instituteContext.faq.find(faq => faq.question.toLowerCase().includes(message.toLowerCase()));
            if (faqAnswer) {
                chatWindow.removeChild(loadingIndicator);
                const botMessage = document.createElement('div');
                botMessage.className = 'chat-message bot-message';
                botMessage.innerHTML = `${formatAnswer(faqAnswer.answer)}<span class="message-time">${formatTime()}</span>`;
                chatWindow.appendChild(botMessage);
                chatWindow.scrollTop = chatWindow.scrollHeight;
                showToast(currentLanguage === 'ar' ? 'تم الرد بنجاح!' : 'Answered successfully!', 'success');
                return;
            }

            // إرسال الطلب إلى Gemini API
            const context = `You are a smart assistant for ${instituteContext.name}, a ${instituteContext.type} institute with subjects: ${instituteContext.subjects.join(', ')}. Answer in ${currentLanguage === 'ar' ? 'Arabic' : 'English'} and provide accurate, concise information.`;
            console.log('Sending request to Gemini API with context:', context);
            const response = await fetch(`${API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${context}\n\nQuestion: ${message}` }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            console.log('API response:', data);
            const rawAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text || (currentLanguage === 'ar' ? 'معلش، حصل خطأ! جرب تاني.' : 'Sorry, something went wrong! Try again.');
            const answer = formatAnswer(rawAnswer);

            // إزالة مؤشر التحميل وإضافة رد البوت
            chatWindow.removeChild(loadingIndicator);
            const botMessage = document.createElement('div');
            botMessage.className = 'chat-message bot-message';
            botMessage.innerHTML = `${answer}<span class="message-time">${formatTime()}</span>`;
            chatWindow.appendChild(botMessage);
            chatWindow.scrollTop = chatWindow.scrollHeight;

            // حفظ السؤال في قاعدة البيانات (افتراضيًا عبر API)
            try {
                await fetch('/api/chatbot/questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: message, answer: rawAnswer, institute: instituteContext.name, language: currentLanguage })
                });
                console.log('Question saved to database');
            } catch (error) {
                console.error('Error saving question:', error);
            }

            showToast(currentLanguage === 'ar' ? 'تم الرد بنجاح!' : 'Answered successfully!', 'success');
        } catch (error) {
            console.error('Error in sendMessage:', error);
            chatWindow.removeChild(document.querySelector('.loading'));
            showToast(currentLanguage === 'ar' ? 'خطأ أثناء إرسال الرسالة! جرب تاني.' : 'Error sending message! Try again.', 'error');
        }
    }

    // دالة مسح الدردشة
    window.clearChat = function() {
        console.log('clearChat called');
        try {
            chatWindow.innerHTML = '';
            showToast(currentLanguage === 'ar' ? 'تم مسح الدردشة!' : 'Chat cleared!', 'success');
        } catch (error) {
            console.error('Error in clearChat:', error);
            showToast(currentLanguage === 'ar' ? 'خطأ أثناء مسح الدردشة!' : 'Error clearing chat!', 'error');
        }
    };

    // دالة عرض إشعارات Toastify
    function showToast(message, type = 'success') {
        let backgroundColor, boxShadow;
        switch (type) {
            case 'success':
                backgroundColor = 'linear-gradient(135deg, #28a745, #218838)';
                boxShadow = '0 4px 15px rgba(40, 167, 69, 0.5)';
                break;
            case 'error':
                backgroundColor = 'linear-gradient(135deg, #dc3545, #c82333)';
                boxShadow = '0 4px 15px rgba(220, 53, 69, 0.5)';
                break;
            case 'info':
                backgroundColor = 'linear-gradient(135deg, #17a2b8, #117a8b)';
                boxShadow = '0 4px 15px rgba(23, 162, 184, 0.5)';
                break;
            default:
                backgroundColor = '#333';
                boxShadow = '0 4px 15px rgba(0, 0, 0, 0.5)';
        }
        Toastify({
            text: message,
            duration: 4000,
            gravity: 'top',
            position: 'right',
            backgroundColor: backgroundColor,
            stopOnFocus: true,
            style: {
                fontSize: '18px',
                fontFamily: '"Cairo", sans-serif',
                padding: '20px 30px',
                borderRadius: '10px',
                direction: currentLanguage === 'ar' ? 'rtl' : 'ltr',
                boxShadow: boxShadow,
                color: '#fff',
                maxWidth: '400px',
                textAlign: currentLanguage === 'ar' ? 'right' : 'left',
            }
        }).showToast();
    }

    console.log('Chatbot initialized successfully');
});
