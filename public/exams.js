document.addEventListener('DOMContentLoaded', function() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
    if (!loggedInUser) {
        showToast('يرجى تسجيل الدخول أولاً!', 'error');
        window.location.href = 'login.html';
        return;
    }

    // التحقق من وجود عناصر DOM
    const examAccess = document.getElementById('exam-access');
    const examContainer = document.getElementById('exam-container');
    const timerDisplay = document.getElementById('timer');
    if (!examAccess || !examContainer || !timerDisplay) {
        console.error('DOM elements missing:', { examAccess, examContainer, timerDisplay });
        showToast('خطأ في تحميل الصفحة! يرجى إعادة تحميل الصفحة.', 'error');
        return;
    }

    // عرض الناف بار
    const navBar = document.getElementById('nav-bar');
    const navItems = [
        { href: 'index.html', icon: 'fas fa-home', title: 'الرئيسية' },
        { href: 'Home.html', icon: 'fas fa-chart-line', title: 'النتائج' },
        { href: 'profile.html', icon: 'fas fa-user', title: 'الملف الشخصي' },
        { href: 'exams.html', icon: 'fas fa-book', title: 'الاختبارات' },
        { href: 'chatbot.html', icon: 'fas fa-robot', title: 'المساعد الذكي' }
    ];
    if (loggedInUser.type === 'admin') {
        navItems.push({ href: 'admin.html', icon: 'fas fa-cogs', title: 'لوحة التحكم' });
    }
    navBar.innerHTML = navItems.map(item => `
        <a href="${item.href}" title="${item.title}"><i class="${item.icon}"></i></a>
    `).join('');

    let timerInterval = null;

    // الوصول إلى الاختبار
    document.getElementById('exam-access-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const code = document.getElementById('exam-code').value.trim();
        if (!code) {
            showToast('يرجى إدخال كود الاختبار!', 'error');
            return;
        }

        try {
            console.log('Fetching exam with code:', code);
            const response = await fetch(`https://school-system-aldabeia-production-33db.up.railway.app/api/exams/${encodeURIComponent(code)}`);
            console.log('Response status:', response.status);
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error response from server:', errorData);
                showToast(errorData.error || 'كود الاختبار غير صحيح!', 'error');
                return;
            }
            const exam = await response.json();
            console.log('Exam data:', exam);
            document.getElementById('exam-title').textContent = exam.name;
            const examForm = document.getElementById('exam-form');
            examForm.innerHTML = exam.questions.map((q, index) => `
                <div class="question">
                    <p><strong>سؤال ${index + 1}:</strong> ${q.text}</p>
                    ${q.type === 'multiple' ? q.options.map((opt, i) => `
                        <label><input type="radio" name="q${index}" value="${opt}"> ${opt}</label><br>
                    `).join('') : ''}
                    ${q.type === 'essay' ? `<textarea name="q${index}" rows="4" placeholder="أدخل إجابتك"></textarea>` : ''}
                    ${q.type === 'list' ? `
                        <div class="list-answers">
                            ${[1, 2, 3, 4, 5].map(i => `<div><span>${i}.</span><input type="text" name="q${index}-${i}" placeholder="الإجابة ${i}"></div>`).join('')}
                        </div>
                    ` : ''}
                    ${q.type === 'truefalse' ? `
                        <label><input type="radio" name="q${index}" value="true"> صح</label>
                        <label><input type="radio" name="q${index}" value="false"> خطأ</label>
                    ` : ''}
                </div>
            `).join('');
            examAccess.style.display = 'none';
            examContainer.style.display = 'block';

            // بدء المؤقت
            const duration = exam.duration * 60; // تحويل الدقائق إلى ثوان
            let timeLeft = duration;
            timerDisplay.textContent = `الوقت المتبقي: ${formatTime(timeLeft)}`;
            timerInterval = setInterval(() => {
                timeLeft--;
                timerDisplay.textContent = `الوقت المتبقي: ${formatTime(timeLeft)}`;
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    timerDisplay.textContent = 'انتهى الوقت!';
                    submitExam(code, exam); // إرسال الإجابات تلقائيًا
                }
            }, 1000);
        } catch (error) {
            console.error('Error fetching exam:', error);
            showToast(`خطأ في جلب الاختبار: ${error.message}`, 'error');
        }
    });

    // دالة تنسيق الوقت
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // دالة إرسال الإجابات
    async function submitExam(code, exam) {
        const form = document.getElementById('exam-form');
        const formData = new FormData(form);
        try {
            const answers = [];
            exam.questions.forEach((q, index) => {
                if (q.type === 'multiple' || q.type === 'truefalse') {
                    answers.push({ questionIndex: index, answer: formData.get(`q${index}`) });
                } else if (q.type === 'essay') {
                    answers.push({ questionIndex: index, answer: formData.get(`q${index}`) });
                } else if (q.type === 'list') {
                    const listAnswers = [1, 2, 3, 4, 5].map(i => formData.get(`q${index}-${i}`)).filter(val => val);
                    answers.push({ questionIndex: index, answers: listAnswers });
                }
            });

            // تصحيح الاختبار
            let score = 0;
            exam.questions.forEach((q, i) => {
                const userAnswer = answers.find(a => a.questionIndex === i);
                if (q.type === 'multiple' || q.type === 'truefalse') {
                    if (userAnswer && userAnswer.answer === q.correctAnswer) score++;
                } else if (q.type === 'essay') {
                    if (userAnswer && userAnswer.answer) {
                        const userWords = userAnswer.answer.toLowerCase().split(/\s+/).filter(word => word);
                        const correctWords = q.correctAnswer.toLowerCase().split(/\s+/).filter(word => word);
                        const matches = userWords.filter(word => correctWords.includes(word)).length;
                        if (matches / correctWords.length >= 0.7) score++;
                    }
                } else if (q.type === 'list') {
                    if (userAnswer && userAnswer.answers) {
                        const userWords = userAnswer.answers.map(a => a.toLowerCase());
                        const correctWords = q.correctAnswers.map(a => a.toLowerCase());
                        const matches = userWords.filter(word => correctWords.includes(word)).length;
                        if (matches / correctWords.length >= 0.7) score++;
                    }
                }
            });

            const percentage = (score / exam.questions.length) * 100;
            await fetch('https://school-system-aldabeia-production-33db.up.railway.app/api/exams/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examCode: code, studentId: loggedInUser.username, score: percentage })
            });
            showToast(`نتيجتك: ${percentage.toFixed(1)}%`, 'success');
            clearInterval(timerInterval);
            examContainer.style.display = 'none';
            examAccess.style.display = 'block';
            document.getElementById('exam-code').value = '';
        } catch (error) {
            console.error('Error submitting exam:', error);
            showToast(`خطأ في إرسال الإجابات: ${error.message}`, 'error');
        }
    }

    // إرسال الإجابات يدويًا
    document.getElementById('submit-exam').addEventListener('click', async function() {
        const code = document.getElementById('exam-code').value.trim();
        const examResponse = await fetch(`https://school-system-aldabeia-production-33db.up.railway.app/api/exams/${encodeURIComponent(code)}`);
        if (!examResponse.ok) {
            const errorData = await examResponse.json();
            console.error('Error fetching exam for submission:', errorData);
            showToast(errorData.error || 'كود الاختبار غير صحيح!', 'error');
            return;
        }
        const exam = await examResponse.json();
        submitExam(code, exam);
    });

    // دالة Toastify
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
});
