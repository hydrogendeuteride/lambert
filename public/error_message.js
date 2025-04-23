export function showAlertInElement(targetElement, message, options = {}) {
    const duration = options.duration ?? 5000;
    const backgroundColor = options.backgroundColor ?? '#f44336';

    if (typeof targetElement === 'string') {
        targetElement = document.getElementById(targetElement);
    }

    if (!(targetElement instanceof HTMLElement)) {
        console.error('Invaild DOM input');
        return;
    }

    const alertBox = document.createElement('div');
    alertBox.textContent = message;
    alertBox.style.cssText = `
      background-color: ${backgroundColor};
      color: white;
      padding: 10px 16px;
      margin: 5px 0;
      border-radius: 4px;
      font-size: 14px;
    `;

    targetElement.appendChild(alertBox);

    if (duration > 0) {
        setTimeout(() => {
            alertBox.remove();
        }, duration);
    }
}