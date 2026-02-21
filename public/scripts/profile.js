const profileForm = document.getElementById('profile-form');
const passwordForm = document.getElementById('password-form');
const backBtn = document.getElementById('back-btn');
const token = localStorage.getItem('token');
let currentLanguagePref = 'en';

function t(key, fallback) {
    return (translations[currentLanguage] && translations[currentLanguage][key]) || fallback || key;
}

function updateLanguagePreferenceDisplay(value) {
    const displayElement = document.getElementById('language-pref-display');
    if (!displayElement) return;

    const translationsMap = {
        en: t('English', 'English'),
        es: t('Spanish', 'Spanish')
    };
    displayElement.textContent = translationsMap[value] || value;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Back button
    backBtn.addEventListener('click', () => {
        // If there's history, go back. Otherwise, close window
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    });

    if (!token) {
        window.location.href = '/login.html';
    }

    try {
        const res = await fetch('/api/users/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const user = await res.json();
        if (res.ok) {
            profileForm.username.value = user.username;
            profileForm.email.value = user.email;
            profileForm.first_name.value = user.first_name;
            profileForm.last_name.value = user.last_name;
            currentLanguagePref = user.language_pref;
            updateLanguagePreferenceDisplay(user.language_pref);
        } else {
            alert(user.message);
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error(error);
        alert(t('An error occurred. Please try again.', 'An error occurred. Please try again.'));
        window.location.href = '/login.html';
    }
});

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = profileForm.username.value;
    const email = profileForm.email.value;
    const first_name = profileForm.first_name.value;
    const last_name = profileForm.last_name.value;
    const language_pref = currentLanguagePref;

    try {
        const res = await fetch('/api/users/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username, email, first_name, last_name, language_pref })
        });
        const data = await res.json();
        alert(data.message || t('Profile updated successfully', 'Profile updated successfully'));
    } catch (error) {
        console.error(error);
        alert(t('An error occurred. Please try again.', 'An error occurred. Please try again.'));
    }
});

passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordForm.new_password.value;

    try {
        const res = await fetch('/api/users/me/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        alert(data.message || t('Password changed successfully', 'Password changed successfully'));
    } catch (error) {
        console.error(error);
        alert(t('An error occurred. Please try again.', 'An error occurred. Please try again.'));
    }
});

const Profile = {
    toggleLanguageDropdown() {
        const dropdown = document.getElementById('language-pref-dropdown');
        const button = document.getElementById('language-pref-btn');
        if (!dropdown || !button) return;
        const isVisible = !dropdown.classList.contains('hidden');
        if (isVisible) {
            dropdown.classList.add('hidden');
            button.classList.remove('active');
        } else {
            dropdown.classList.remove('hidden');
            button.classList.add('active');
        }
    },

    selectLanguageOption(value) {
        currentLanguagePref = value;
        updateLanguagePreferenceDisplay(value);
        this.toggleLanguageDropdown();
    }
};
