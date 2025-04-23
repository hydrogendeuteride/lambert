document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('header.html');
        const headerHTML = await response.text();
        document.getElementById('header-placeholder').innerHTML = headerHTML;
        document.getElementById('logout').addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        });
    } catch (error) {
    console.error('header load failed:', error);
    }
});