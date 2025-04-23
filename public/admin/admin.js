document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    alert('Login needed');
    window.location.href = '/login.html';
    return;
  }

  try {
    const response = await fetch('/verify-token', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    if (!data.valid || data.role !== 'admin') {
      alert('Not admin account');
      window.location.href = '/login.html';
    }
  } catch (error) {
    console.error('Authentication error:', error);
    window.location.href = '/login.html';
  }

  fetch('/admin/users', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => response.json())
    .then(users => {
      const userTable = document.getElementById('userTable').getElementsByTagName('tbody')[0];
      users.forEach(user => {
        const row = userTable.insertRow();

        const nameCell = row.insertCell(0);
        const emailCell = row.insertCell(1);
        const roleCell = row.insertCell(2);
        const actionCell = row.insertCell(3);

        nameCell.textContent = user.name;
        emailCell.textContent = user.email;
        roleCell.textContent = user.role;

        if (user.role !== 'admin') {
          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = 'Delete';
          deleteBtn.classList.add('delete-user-btn');
          deleteBtn.setAttribute('data-user-id', user._id);

          deleteBtn.addEventListener('click', () => {
            const userId = deleteBtn.getAttribute('data-user-id');
            deleteUser(userId);
          });

          actionCell.appendChild(deleteBtn);
        }
      });
    })
    .catch(error => console.error('Error: ', error));
});

async function deleteUser(userId) {
  const token = localStorage.getItem('token');
  const confirmation = confirm('Are you sure you want to delete this user?');
  if (confirmation) {
    fetch(`/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(() => {
        window.location.reload();
      })
      .catch(error => console.error('Error:', error));
  }
}
