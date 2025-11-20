// chatbot.js - النسخة الأسطورية 2025 - شغالة 100% مع التصميم الجديد
document.addEventListener('DOMContentLoaded', () => {
    console.log('%cالمساعد الذكي تم تشغيله بنجاح!', 'color:#d4af37;font-size:18px;font-weight:bold');

    // العناصر
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const themeBtn = document.getElementById('theme-btn');
    const suggestedQuestions = document.getElementById('suggested-questions');

    // إعدادات
    const API_KEY = 'AIzaSyB_BhSZ-xN5oCJlJfVvu_zr7bSl_Wi6VIA'; // غيّره بمفتاحك الحقيقي
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

    let isDarkMode = true;
    let conversationHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');

    // سياق المعهد
    const instituteContext = `
أنت مساعد ذكي لـ "معهد رعاية الضبعية"، معهد طبي متخصص في التمريض والرعاية الصحية.
- الرد دائمًا باللغة العربية الفصحى واللهجة المصرية الخفيفة.
- كن ودودًا، مرحًا، ومفيدًا.
- لو الطالب سأل عن نتيجته أو درجاته، قول له يدخل على صفحة "النتائج".
- لو سأل عن مواعيد أو تسجيل، قوله التسجيل مفتوح من يونيو لأغسطس.
- لو طلب نكتة، رد بنكتة مضحكة وخفيفة.
`.trim();

    // تحميل المحادثة القديمة
    function loadConversation() {
        chatWindow.innerHTML = '';
        if (conversationHistory.length === 0) {
            showWelcomeMessage();
            return;
        }
        conversationHistory.forEach(msg => {
            if (msg.role === 'user') addUserMessage(msg.text);
            else addBotMessage(msg.text);
        });
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function showWelcomeMessage() {
        const welcome = `
            <div class="welcome animate__animated animate__zoomIn">
                <img src="bot-avatar.png" alt="المساعد" class="bot-avatar" 
                     onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=DaabiaBot'">
                <h2>أهلاً وسهلاً بيك في معهد رعاية الضبعية</h2>
                <p>أنا "ضبعي بوت"، جاهز أساعدك في أي حاجة: دراسة، نتايج، مواعيد، نكت، أو حتى لو بس عايز تهزر</p>
            </div>
        `;
        chatWindow.innerHTML = welcome;
    }

    function addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'message user animate__animated animate__fadeInRight';
        div.innerHTML = `
            ${text}
            <span class="message-time">${new Date().toLocaleTimeString('ar-EG', {hour: 'numeric', minute: '2-digit'})}</span>
        `;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        saveToHistory('user', text);
    }

    function addBotMessage(text) {
        const div = document.createElement('div');
        div.className = 'message bot animate__animated animate__fadeInLeft';
        div.innerHTML = `
            ${formatResponse(text)}
            <span class="message-time">${new Date().toLocaleTimeString('ar-EG', {hour: 'numeric', minute: '2-digit'})}</span>
        `;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        saveToHistory('bot', text);
    }

    function formatResponse(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    function saveToHistory(role, text) {
        conversationHistory.push({ role, text, timestamp: new Date().toISOString() });
        if (conversationHistory.length > 50) conversationHistory.shift();
        localStorage.setItem('chatHistory', JSON.stringify(conversationHistory));
    }

    // إرسال الرسالة
    async function sendMessage(text = chatInput.value.trim()) {
        if (!text) return;

        addUserMessage(text);
        chatInput.value = '';

        // مؤشر الكتابة
        const typingIndicator(true);

        try {
            const response = await fetch(`${API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: instituteContext + "\n\nالسؤال: " + text }] }]
                })
            });

            if (!response.ok) throw new Error('فشل الاتصال بـ Gemini');

            const data = await response.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "معلش، مش عارف أرد دلوقتي";

            typingIndicator(false);
            addBotMessage(reply);

        } catch (err) {
            typingIndicator(false);
            addBotMessage("عذراً، في مشكلة في الاتصال بالإنترنت أو السيرفر. جرب تاني بعد شوية");
            console.error(err);
        }
    }

    function typingIndicator(show) {
        const existing = document.querySelector('.typing');
        if (existing) existing.remove();

        if (show) {
            const div = document.createElement('div');
            div.className = 'message bot typing animate__animated animate__fadeInLeft';
            div.innerHTML = `
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            `;
            chatWindow.appendChild(div);
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    }

    // الأحداث
    sendBtn.addEventListener('click', () => sendMessage());
    chatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });

    // الأسئلة المقترحة
    suggestedQuestions.addEventListener('click', e => {
        if (e.target.classList.contains('suggestion')) {
            const text = e.target.dataset.text;
            chatInput.value = text;
            sendMessage(text);
        }
    });

    // زر الصوت (جاهز للتفعيل لاحقًا)
    voiceBtn.addEventListener('click', () => {
        Toastify({
            text: "قريبًا جدًا! التحدث بالصوت جاي في التحديث الجاي",
            duration: 3000,
            backgroundColor: "linear-gradient(135deg, #d4af37, #ffc107)",
            gravity: "top"
        }).showToast();
    });

    // ثيم داكن/فاتح
    themeBtn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('light-mode');
        themeBtn.innerHTML = isDarkMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        localStorage.setItem('chatTheme', isDarkMode ? 'dark' : 'light');
    });

    // تحميل الثيم المحفوظ
    if (localStorage.getItem('chatTheme') === 'light') {
        document.body.classList.add('light-mode');
        themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        isDarkMode = false;
    }

    // بدء المحادثة
    loadConversation();
});            { href: 'index.html', icon: 'fas fa-home', title: currentLanguage === 'ar' ? 'الرئيسية' : 'Home' },
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
