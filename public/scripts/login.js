const form = document.getElementById('login-form');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value;
    const password = form.password.value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            window.location.href = '/';
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error(error);
        alert('An error occurred. Please try again.');
    }
});