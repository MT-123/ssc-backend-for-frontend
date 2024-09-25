import { CognitoIdentityProviderClient, ConfirmForgotPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { configure } from './reset-password-env';

// the lambda function redirects browser to this page with search param 'sub'
const urlParams = new URLSearchParams(window.location.search);
const receivedSub = urlParams.get('sub');

/**
 * Configure some listeners when the DOM is ready
 */
(() => {
    'use strict'
    const resetPasswordForm = document.getElementById('form-reset-password');

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

const resetPassword = async () => {
    const code = document.getElementById('floatingCode').value;
    const password = document.getElementById('floatingPassword').value;
    const password2 = document.getElementById('floatingPassword2').value;

    if (password !== password2) {
        alert('password and confirm password mismatched', 'danger');
        return;
    }

    try {
        const client = new CognitoIdentityProviderClient({ region: configure.region });
        const input = { // ConfirmForgotPasswordRequest
            ClientId: configure.clientId, // required
            Username: receivedSub, // required
            ConfirmationCode: code, // required
            Password: password, // required
        };
        const command = new ConfirmForgotPasswordCommand(input);

        await client.send(command);

    } catch (err) {
        alert(err);
        return;
    }

    alert('Password reset successful. Please Sign in with new password', 'success');
}
