document.addEventListener('DOMContentLoaded', function() {
    console.log('Chatbot JS loaded at', new Date().toLocaleString());

    // جلب العناصر
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.querySelector('.send-btn');
    const chatWindow = document.getElementById('chat-window');
    console.log('Chat elements:', { chatInput: !!chatInput, sendBtn: !!sendBtn, chatWindow: !!chatWindow });

    // فحص وجود العناصر
    if (!chatInput || !sendBtn || !chatWindow) {
        console.error('Missing required elements:', { chatInput, sendBtn, chatWindow });
        showToast('خطأ: حقل الإدخال أو زر الإرسال أو نافذة الدردشة غير موجودة!', 'error');
        return;
    }

    // مفتاح API (ضعه في ملف .env في الباك إند للأمان)
    const API_KEY = 'AIzaSyB_BhSZ-xN5oCJlJfVvu_zr7bSl_Wi6VIA'; // استبدل بمفتاحك الجديد
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    // تحديث الناف بار
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const navBar = document.getElementById('nav-bar');
    if (navBar) {
        const navItems = [
            { href: 'index.html', icon: 'fas fa-home', title: 'الرئيسية' },
            { href: 'home.html', icon: 'fas fa-chart-line', title: 'النتائج' }, // تصحيح إلى home.html
            { href: 'profile.html', icon: 'fas fa-user', title: 'الملف الشخصي' },
            { href: 'chatbot.html', icon: 'fas fa-robot', title: 'المساعد الذكي' }
        ];
        if (loggedInUser && loggedInUser.type === 'admin') {
            navItems.push({ href: 'admin.html', icon: 'fas fa-cogs', title: 'لوحة التحكم' });
        }
        navBar.innerHTML = navItems.map(item => `
            <a href="${item.href}" class="${item.href === 'chatbot.html' ? 'active' : ''}">
                <i class="${item.icon}" title="${item.title}"></i>
            </a>
        `).join('');
        console.log('Nav bar updated with items:', navItems);

        // التحقق من تحميل الأيقونات
        if (typeof window.FontAwesome === 'undefined') {
            console.error('Font Awesome not loaded');
            showToast('خطأ: فشل تحميل أيقونات الناف بار!', 'error');
        }

        // إضافة إشعار عند التنقل
        document.querySelectorAll('.nav-bar a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-bar a').forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const title = e.currentTarget.querySelector('i').getAttribute('title');
                const href = e.currentTarget.getAttribute('href');
                console.log('Navigating to:', href);
                showToast(`تم الانتقال إلى ${title}`, 'success');
                setTimeout(() => {
                    try {
                        window.location.href = href;
                    } catch (error) {
                        console.error('Navigation error:', error);
                        showToast('خطأ أثناء الانتقال إلى الصفحة!', 'error');
                    }
                }, 1000);
            });
        });
    } else {
        console.error('Nav bar element not found');
        showToast('خطأ: الناف بار غير موجود!', 'error');
    }

    // دالة تنسيق الوقت
    function formatTime() {
        const now = new Date();
        const hours = now.getHours() % 12 || 12;
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const period = now.getHours() >= 12 ? 'م' : 'ص';
        return `${hours}:${minutes} ${period}`;
    }

    // دالة تنسيق الرد
    function formatAnswer(text) {
        if (!text) return 'معلش، حصل خطأ! جرب تاني.';
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
                showToast('اكتب سؤال أولًا!', 'error');
                return;
            }

            console.log('Adding user message:', message);
            const userMessage = document.createElement('div');
            userMessage.className = 'chat-message user-message';
            userMessage.innerHTML = `${message}<span class="message-time">${formatTime()}</span>`;
            chatWindow.appendChild(userMessage);
            chatInput.value = '';
            chatWindow.scrollTop = chatWindow.scrollHeight;

            console.log('Sending request to Gemini API...');
            const response = await fetch(`${API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: message }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            console.log('API response:', data);
            const rawAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'معلش، حصل خطأ! جرب تاني.';
            const answer = formatAnswer(rawAnswer);

            console.log('Adding bot message:', answer);
            const botMessage = document.createElement('div');
            botMessage.className = 'chat-message bot-message';
            botMessage.innerHTML = `${answer}<span class="message-time">${formatTime()}</span>`;
            chatWindow.appendChild(botMessage);
            chatWindow.scrollTop = chatWindow.scrollHeight;

            showToast('تم الرد بنجاح!', 'success');
        } catch (error) {
            console.error('Error in sendMessage:', error);
            showToast('خطأ أثناء إرسال الرسالة! جرب تاني.', 'error');
        }
    }

    // دالة مسح الدردشة
    window.clearChat = function() {
        console.log('clearChat called');
        try {
            chatWindow.innerHTML = '';
            showToast('تم مسح الدردشة!', 'success');
        } catch (error) {
            console.error('Error in clearChat:', error);
            showToast('خطأ أثناء مسح الدردشة!', 'error');
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
                direction: 'rtl',
                boxShadow: boxShadow,
                color: '#fff',
                maxWidth: '400px',
                textAlign: 'right',
            }
        }).showToast();
    }

    console.log('Chatbot initialized successfully');
});
