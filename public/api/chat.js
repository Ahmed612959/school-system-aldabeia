// api/chat.js
export default async function handler(req, res) {
  // السماح فقط بطلبات POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;

  // التحقق من وجود الرسالة
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'الرسالة مطلوبة ولا يمكن أن تكون فارغة' });
  }

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `أنت مساعد ذكي احترافي لمعهد رعاية الضبعية للتمريض.
رد دائمًا بالعربية (فصحى أو عامية مصرية حسب السياق)، كن ودودًا، دقيقًا، مفيدًا جدًا.
ركز على مواضيع التمريض، التمريض الجراحي، الرعاية التلطيفية، Hospice care، Palliative care، Brain death، Death، Complementary therapy، والدراسة والنتائج.
إذا سأل عن نتيجة شهرية أو نهائية، قول: "روح على صفحة نتيجة الشهري وادخل الكود بتاعك".
لا تختلق معلومات، وإذا مش متأكد قول "مش متأكد، ممكن توضح أكتر؟"`
          },
          {
            role: 'user',
            content: message.trim()
          }
        ],
        temperature: 0.75,
        max_tokens: 1200,
        top_p: 0.9
      })
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      throw new Error(errorData.error?.message || `Groq API returned ${groqResponse.status}`);
    }

    const data = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'معلش، مش قادر أرد دلوقتي...';

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Groq API Error:', error.message);
    return res.status(500).json({ error: 'حدث خطأ داخلي، جرب تاني بعد شوية' });
  }
}
