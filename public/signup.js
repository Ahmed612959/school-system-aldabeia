document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // 🚀 يمنع الريلود

    const data = {
        fullName: fullName.value.trim(),
        username: username.value.trim(),
        password: password.value,
        phone: phone.value.trim(),
        parentName: parentName.value.trim(),
        parentId: parentId.value.trim(),
        year: year.value
    };

    console.log("SENDING:", data);

    try {
        const res = await fetch('/api/register-student', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        console.log(result);

        if (!res.ok) throw new Error(result.error);

        alert("تم التسجيل بنجاح ✅");

    } catch (err) {
        alert(err.message);
    }
});
