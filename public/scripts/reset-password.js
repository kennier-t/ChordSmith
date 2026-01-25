const form = document.getElementById('reset-password-form');
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (token) {
    // Show reset password form
    document.getElementById('form-title').textContent = 'Enter New Password';
    document.getElementById('email-group').style.display = 'none';
    document.getElementById('password-group').style.display = 'block';
    document.getElementById('confirm-password-group').style.display = 'block';
    document.getElementById('submit-btn').textContent = 'Reset Password';
    document.getElementById('email').required = false;
    document.getElementById('password').required = true;
    document.getElementById('confirm-password').required = true;
} else {
    // Show forgot password form
    document.getElementById('password-group').style.display = 'none';
    document.getElementById('confirm-password-group').style.display = 'none';
    document.getElementById('password').required = false;
    document.getElementById('confirm-password').required = false;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (token) {
        // Reset password
        const password = form.password.value;
        const confirmPassword = form['confirm-password'].value;

        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, password })
            });
            const data = await res.json();
            alert(data.message);
            if (res.ok) {
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred. Please try again.');
        }
    } else {
        // Forgot password
        const email = form.email.value;

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            alert(data.message);
        } catch (error) {
            console.error(error);
            alert('An error occurred. Please try again.');
        }
    }
});