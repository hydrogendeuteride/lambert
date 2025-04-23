document.addEventListener('DOMContentLoaded', async () => {
    try {
    
    const response = await fetch('sidebar.html');
    const sidebarHTML = await response.text();
    document.getElementById('sidebar-placeholder').innerHTML = sidebarHTML;

    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    const toggleButton = document.getElementById('sidebar-toggle');

    toggleButton.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');

        if (sidebar.classList.contains('collapsed')) {
            content.style.marginLeft = "60px";
        } else {
            content.style.marginLeft = "250px";
        }
    });

    } catch (error) {
        console.error('error loading sidebar', error);
    }
});
