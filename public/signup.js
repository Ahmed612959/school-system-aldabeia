async function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const studentCode = document.getElementById('studentCode').value;

  if (!username || !password || !studentCode) {
    return show("املأ كل البيانات");
  }

  try {
    const res = await fetch('http://localhost:3001/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, studentCode })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    show("تم التسجيل بنجاح ✅");

  } catch (err) {
    show(err.message);
  }
}

function show(msg) {
  document.getElementById('msg').innerText = msg;
}