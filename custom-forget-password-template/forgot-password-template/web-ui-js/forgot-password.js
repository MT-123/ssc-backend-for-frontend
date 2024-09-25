import { configure } from './forgot-password-env';

/**
 * Configure some listeners when the DOM is ready
 */
(() => {
    'use strict'
    const forgotPasswordForm = document.getElementById('form-forgot-password');

    forgotPasswordForm.addEventListener('submit', (event) => {
        forgotPasswordForm.classList.add('was-validated');
        event.preventDefault();
        event.stopPropagation();
        if (forgotPasswordForm.checkValidity()) forgotPassword();
    }, false);
})()

const forgotPassword = () => {
    const email = document.getElementById('floatingEmail').value;
    const forgotPasswordHandleURL = new URL(configure.forgotPasswordHandleURL);

    forgotPasswordHandleURL.searchParams.append('email', email);
    window.location.href = forgotPasswordHandleURL.toString();
}
