// public/js/chatbot.js
document.addEventListener('DOMContentLoaded', function () {
    console.log('Chatbot JS loaded - مصري أصلي 100%');

    // العناصر الأساسية
    const chatWindow     = document.getElementById('chat-window');
    const chatInput      = document.getElementById('chat-input');
    const sendBtn        = document.getElementById('send-btn');
    const voiceBtn       = document.getElementById('voice-btn');
    const clearBtn       = document.getElementById('clearChat');
    const modeToggle     = document.getElementById('modeToggle');
    const suggestions    = document.querySelectorAll('.suggestions div');

    // الأصوات
    const sendSound    = new Audio("https://cdn.pixabay.com/download/audio/2022/03/15/audio_233a3e35a3.mp3?filename=message-133874.mp3");
    const receiveSound = new Audio("https://cdn.pixabay.com/download/audio/2021/12/22/audio_c16a4c19f1.mp3?filename=bell-58749.mp3");

    // Dark Mode
    modeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        modeToggle.classList.toggle('fa-moon');
        modeToggle.classList.toggle('fa-sun');
    });

    // مسح الدردشة
    clearBtn.addEventListener('click', () => {
        if (confirm('هتمسح الدردشة كلها؟')) {
            chatWindow.innerHTML = `
                <div class="welcome">
                    <h2>مرحباً بكِ</h2>
                    <p>أنا مساعدك الذكي — جاهز لمساعدتك في الأسئلة، الواجبات، الجداول والنتائج.</p>
                    <small>الخصوصية مضمونة بالكامل</small>
                </div>`;
        }
    });

    // إضافة رسالة
    function addMessage(text, type) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${type}`;
        msgDiv.innerHTML = `
            <div class="av"><img src="${type === 'user' ? 'Karton.jpeg' : 'logo.png'}" alt=""></div>
            <div class="b">
                ${text.replace(/\n/g, '<br>')}
                <div class="time">${new Date().toLocaleTimeString('ar-EG', {hour: 'numeric', minute: '2-digit'})}</div>
            </div>
        `;
        chatWindow.appendChild(msgDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        if (type === 'user') sendSound.play();
        else receiveSound.play();
    }

    // حالة الكتابة
    function showTyping() {
        const typing = document.createElement('div');
        typing.className = 'msg bot';
        typing.id = 'typing';
        typing.innerHTML = `<div class="b"><div class="typing"><span></span><span></span><span></span></div></div>`;
        chatWindow.appendChild(typing);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function removeTyping() {
        document.getElementById('typing')?.remove();
    }

    // إرسال الرسالة للسيرفر (آمن 100% - المفتاح في الـ Backend)
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        chatInput.value = '';
        showTyping();

        try {
            const res = await fetch('/api/gemini', {  // مهم: بدون الدومين لأننا على نفس السيرفر
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: message })
            });

            removeTyping();

            if (!res.ok) throw new Error('Network error');

            const data = await res.json();
            const reply = data.reply || 'يا قمر… في حاجة غلط، جربي تاني';

            addMessage(reply, 'bot');

        } catch (err) {
            console.error('Gemini Error:', err);
            removeTyping();
            addMessage('النت وقع يا وحش… جربي تاني بعد شوية', 'bot');
        }
    }

    // الأحداث الأساسية
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });

    // الاقتراحات السريعة
    suggestions.forEach(s => {
        s.addEventListener('click', () => {
            chatInput.value = s.textContent;
            sendMessage();
        });
    });

    // التعرف على الصوت (اختياري وشغال في كل المتصفحات الحديثة)
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-EG';
        recognition.interimResults = false;

        voiceBtn.addEventListener('click', () => {
            recognition.start();
            voiceBtn.style.background = 'red';
        });

        recognition.onresult = (e) => {
            chatInput.value = e.results[0][0].transcript;
            sendMessage();
        };

        recognition.onend = () => {
            voiceBtn.style.background = '';
        };
    }

    // رسالة الترحيب التلقائية
    setTimeout(() => {
        addMessage('أهلاً يا أجمل طالبة في معهد رعاية الضبعية! ازيك النهاردة؟ عايزة أساعدك في إيه يا قمر؟', 'bot');
    }, 1000);

    console.log('Chatbot initialized successfully - SchoolX is now unstoppable!');
});
