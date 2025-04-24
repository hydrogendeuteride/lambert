document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAllErrors();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();
        if (response.ok) {
            // showSuccessMessage('Registration success. Please Log in');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } else {
            handleValidationErrors(data);
        }
    } catch (error) {
        console.error('Register failed:', error);
        showGeneralError('Server Connection error');
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
        showGeneralError('Register failed');
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
