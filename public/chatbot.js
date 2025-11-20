document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chat-window');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    const API_KEY = 'AIzaSyB_BhSZ-xN5oCJlJfVvu_zr7bSl_Wi6VIA';
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

    const context = `أنت مساعد ذكي ودود لمعهد رعاية الضبعية (معهد طبي للتمريض). رد بالعربية المصرية الخفيفة، كن مرح ومفيد.`;

    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = type === 'user' ? 'message user-message' : 'message bot-message';
        div.innerHTML = text;
        chatWindow.appendChild(div);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function showTyping() {
        const typing = document.createElement('div');
        typing.className = 'message bot-message typing';
        typing.innerHTML = '<span></span><span></span><span></span>';
        typing.id = 'typing-indicator';
        chatWindow.appendChild(typing);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function removeTyping() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    }

    async function sendMessage() {
        const q = userInput.value.trim();
        if (!q) return;

        addMessage(q, 'user');
        userInput.value = '';
        showTyping();

        try {
            const res = await fetch(`${API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: context + "\n\nالسؤال: " + q }] }]
                })
            });
            const data = await res.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "عذرًا، مش قادر أرد دلوقتي";

            removeTyping();
            addMessage(reply.replace(/\*\*/g, '').replace(/\*/g, ''), 'bot');

        } catch (err) {
            removeTyping();
            addMessage("في مشكلة في الاتصال.. جرب تاني بعد شوية", 'bot');
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', e => e.key === 'Enter' && sendMessage());
}); 
