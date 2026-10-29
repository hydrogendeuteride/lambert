document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        redirectToLogin();
        return;
    }
    if (!await validateAdminToken(token)) return;

    await loadPopularRoutes(token);
    await loadTopUsers(token);
});

async function validateAdminToken(token) {
    try {
        const response = await fetch('/verify-token', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!data.valid || data.role !== 'admin') {
            alert('Admin account needed');
            redirectToLogin();
            return false;
        }

        return true;
    } catch (error) {
        console.error('Token Authentication Failed:', error);
        redirectToLogin();
        return false;
    }
}

function redirectToLogin() {
    alert('Login Needed');
    window.location.href = '/login.html';
}

async function loadPopularRoutes(token) {
    try {
        const res = await fetch('/admin/popular-routes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        const tbody = document.querySelector('#popularRoutesTable tbody');
        tbody.innerHTML = '';

        data.forEach(item => {
            const tr = document.createElement('tr');
            for (const value of [item._id.from, item._id.to, item.count]) {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load popular routes:', err);
    }
}

async function loadTopUsers(token) {
    try {
        const res = await fetch('/admin/top-users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        const tbody = document.querySelector('#topUsersTable tbody');
        tbody.innerHTML = '';

        data.forEach(user => {
            const tr = document.createElement('tr');
            for (const value of [user.userIdentifier, user.totalCalls]) {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Failed to load top users:', err);
    }
}
