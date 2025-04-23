document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        redirectToLogin();
        return;
    }

    validateAdminToken(token);

    await loadVisitorStats(token);
    await loadVisitorChart(token);
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

async function loadVisitorStats(token) {
    try {
        const res = await fetch('/admin/overview', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();

        document.getElementById('visitors-today').textContent = data.visitors.today;
        document.getElementById('visitors-total').textContent = data.visitors.total;

    } catch (error) {
        console.error('Failed to load visitor stats:', error);
    }
}

async function loadVisitorChart(token) {
    try {
        const res = await fetch('/admin/daily', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const { dates, values } = await res.json();

        const ctx = document.getElementById('visitorsChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Daily Visitors',
                    data: values,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

    } catch (error) {
        console.error('Failed to load visitor chart:', error);
    }
}
