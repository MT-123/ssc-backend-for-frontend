import { configure } from './forgot-password-env';
import { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";

// sub is user's id and its required by exchanging email address to reset password
let sub = '';
/**
 * Configure some listeners when the DOM is ready
 */
(() => {
    'use strict'
    const forgotPasswordForm = document.getElementById('form-forgot-password');
    const resetPasswordForm = document.getElementById('form-reset-password');

    forgotPasswordForm.addEventListener('submit', async (event) => {
        forgotPasswordForm.classList.add('was-validated');
        event.preventDefault();
        event.stopPropagation();
        if (forgotPasswordForm.checkValidity()) await forgotPassword();
    }, false);

    resetPasswordForm.addEventListener('submit', async (event) => {
        resetPasswordForm.classList.add('was-validated');
        event.preventDefault();
        event.stopPropagation();
        if (resetPasswordForm.checkValidity()) await resetPassword();
    }, false);
})()

/**
 * Displaying important messages on screen
 */
const alert = (message, type) => {
    const wrapper = document.createElement('div');
    const alertPlaceholder = document.getElementById('liveAlertPlaceholder');

    wrapper.innerHTML = [
        `<div class="alert alert-${type} alert-dismissible" role="alert">`,
        `   <div>${message}</div>`,
        '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
        '</div>'
    ].join('');

    alertPlaceholder.append(wrapper);
}

const forgotPassword = async () => {
    const email = document.getElementById('floatingEmail').value;
    const forgotPasswordHandleURL = new URL(configure.getSubURL);

    forgotPasswordHandleURL.searchParams.append('email', email);
    const getSubURL = forgotPasswordHandleURL.toString();

    try {
        // the response of 200 is sub, of non 200 is error message
        const response = await window.fetch(getSubURL);

        if (!response.ok) {
            const message = await response.text();
            alert(message, 'danger');
            return;
        }

        sub = await response.text();;
        alert('We have send a password reset code by email. Enter it below to reset your password.', 'success');
        return;

    } catch (err) {
        alert(err, 'danger');
    }
}

const resetPassword = async () => {
    const code = document.getElementById('floatingCode').value;
    const password = document.getElementById('floatingPassword').value;
    const password2 = document.getElementById('floatingPassword2').value;

    if (password !== password2) {
        alert('password and confirm password mismatched', 'danger');
        return;
    }

    if (sub.length === 0) {
        alert('enter your email first', 'danger');
        return;
    }

    try {
        const client = new CognitoIdentityProviderClient({ region: configure.region });
        const input = { // ConfirmForgotPasswordRequest
            ClientId: configure.clientId, // required
            Username: sub, // required
            ConfirmationCode: code, // required
            Password: password, // required
        };
        const command = new ConfirmForgotPasswordCommand(input);

        await client.send(command);

    } catch (err) {
        alert(err, 'danger');
        return;
    }

    alert('Password reset successful. Please Sign in with new password', 'success');
}
