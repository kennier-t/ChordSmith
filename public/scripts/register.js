const form = document.getElementById('register-form');

function t(key, fallback) {
    return (translations[currentLanguage] && translations[currentLanguage][key]) || fallback || key;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = form.username.value;
    const email = form.email.value;
    const first_name = form.first_name.value;
    const last_name = form.last_name.value;
    const password = form.password.value;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, first_name, last_name, password })
        });
        const data = await res.json();
        alert(data.message);
        if (res.ok) {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error(error);
        alert(t('An error occurred. Please try again.', 'An error occurred. Please try again.'));
    }
});
