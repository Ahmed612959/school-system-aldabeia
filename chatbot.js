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
        alert('خطأ: حقل الإدخال أو زر الإرسال أو نافذة الدردشة غير موجودة!');
        return;
    }

    // مفتاح API (ضعه في ملف .env في الباك إند للأمان)
    const API_KEY = 'AIzaSyC5q7nbeo55hu7p_oJh1TB3Pqa9NCaNWWE-5ZiIUwzJDmGMtRtxk'; // استبدل بمفتاحك الجديد
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
        // تحويل النص لفقرات وقوائم نقطية
        let formatted = text
            .replace(/\n\n/g, '</p><p>') // فقرات
            .replace(/\n/g, '<br>') // أسطر جديدة
            .replace(/(\d+\.\s+)([^\n]+)/g, '<li>$2</li>') // تحويل 1. كذا إلى قائمة
            .replace(/(\<li\>.*\<\/li\>)/s, '<ul>$1</ul>'); // تغليف القوائم بـ <ul>
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
                alert('اكتب سؤال أولًا!');
                return;
            }

            // إضافة رسالة المستخدم
            console.log('Adding user message:', message);
            const userMessage = document.createElement('div');
            userMessage.className = 'chat-message user-message';
            userMessage.innerHTML = `${message}<span class="message-time">${formatTime()}</span>`;
            chatWindow.appendChild(userMessage);
            chatInput.value = '';
            chatWindow.scrollTop = chatWindow.scrollHeight;

            // إرسال طلب لـ Gemini API
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

            // إضافة رد الروبوت
            console.log('Adding bot message:', answer);
            const botMessage = document.createElement('div');
            botMessage.className = 'chat-message bot-message';
            botMessage.innerHTML = `${answer}<span class="message-time">${formatTime()}</span>`;
            chatWindow.appendChild(botMessage);
            chatWindow.scrollTop = chatWindow.scrollHeight;

            alert('تم الرد بنجاح!');
        } catch (error) {
            console.error('Error in sendMessage:', error);
            alert('خطأ أثناء إرسال الرسالة! جرب تاني.');
        }
    }

    // دالة مسح الدردشة
    window.clearChat = function() {
        console.log('clearChat called');
        try {
            chatWindow.innerHTML = '';
            alert('تم مسح الدردشة!');
        } catch (error) {
            console.error('Error in clearChat:', error);
            alert('خطأ أثناء مسح الدردشة!');
        }
    };

    console.log('Chatbot initialized successfully');
});