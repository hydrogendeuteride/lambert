document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAllErrors();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = '/admin/dashboard.html';
        } else {
            handleValidationErrors(data);
        }
    } catch (error) {
        console.error('Login Failed:', error);
        showGeneralError('Server connection error');
    }
});

function handleValidationErrors(data) {
    if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach(err => {
            if (err.param === 'email') {
                showFieldError('email-error', err.msg);
            } else if (err.param === 'password') {
                showFieldError('password-error', err.msg);
            } else {
                showGeneralError(err.msg);
            }
        });
    } else if (data.error) {
        showGeneralError(data.error);
    } else {
        showGeneralError('Login Failed');
    }
}

function clearAllErrors() {
    document.querySelectorAll('.field-error').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    const generalError = document.getElementById('general-error');
    if (generalError) generalError.style.display = 'none';
}

function showFieldError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function showGeneralError(message) {
    let errorDiv = document.getElementById('general-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}
