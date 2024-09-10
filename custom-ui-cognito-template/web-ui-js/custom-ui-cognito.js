// modified from the template https://catalog.workshops.aws/wyld-pets-cognito/en-US/50-lab2-user-pools-sdk/51-initial-setup
import { AuthenticationDetails, CognitoUserPool, CognitoUser, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } from "@aws-sdk/client-cognito-identity-provider";
import { POOL_DATA, CONFIG } from './custom-ui-cognito-env';

const userPool = new CognitoUserPool(POOL_DATA);
const userEmailConfirm = {
    userSub: null,
    isUserConfirmed: false
}
let cognitoUser;
const subscribeCheck = document.getElementById('subscribeCheckbox');

const domEls = {
    name: document.getElementById('floatingName') || {},
    email: document.getElementById('floatingEmail') || {},
    email1: document.getElementById('floatingEmail1') || {},
    password: document.getElementById('floatingPassword') || {},
    password1: document.getElementById('floatingPassword1') || {},
    confirmCode: document.getElementById('floatingCode') || {},
    prefix: document.getElementById('floatingPrefix') || {}
};

const parseJwt = token => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    return JSON.parse(window.atob(base64));
};

const getRadioValue = (name) => {
    // Get all radio buttons with the specified name
    const radioButtons = document.getElementsByName(name);

    // Loop through the radio buttons
    for (const radioButton of radioButtons) {
        // If the radio button is checked, return its value
        if (radioButton.checked) {
            return radioButton.value;
        }
    }

    // If no radio button is checked, return null
    return null;
}

const getVal = inVal => domEls[inVal].value || '';
const dataFmt = inVal => ({ Name: inVal, Value: getVal(inVal) });
const getAttr = inVal => new CognitoUserAttribute(inVal);

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

/**
 * Configure some listeners when the DOM is ready
 */
(() => {
    'use strict'
    const signInForm = document.getElementById('sign-in-form');
    const signUpForm = document.getElementById('sign-up-form');
    const resendCodeForm = document.getElementById('resend-code-btn')
    const confirmCodeForm = document.getElementById('confirm-code-form')

    signInForm.addEventListener('submit', event => {
        signInForm.classList.add('was-validated');
        event.preventDefault();
        event.stopPropagation();
        if (signInForm.checkValidity()) (event.submitter.innerText === 'Sign In') ? signIn() : signOut();
    }, false);

    signUpForm.addEventListener('submit', event => {
        signUpForm.classList.add('was-validated');
        event.preventDefault();
        event.stopPropagation();
        if (signUpForm.checkValidity()) signUp();
    }, false);

    confirmCodeForm.addEventListener('submit', async event => {
        event.preventDefault();
        event.stopPropagation();
        await codeRegistration();
    })

    resendCodeForm.addEventListener('submit', async event => {
        event.preventDefault();
        event.stopPropagation();
        await resendCode();
    })
})()

/**
 * Add Sign Up
 */
const signUp = () => {
    const attributeList = [];

    attributeList.push(getAttr(dataFmt('name')));
    attributeList.push(getAttr({ Name: 'custom:role', Value: getRadioValue('radioRole') }));
    attributeList.push(getAttr({ Name: 'custom:isSubscribed', Value: subscribeCheck.checked ? '1' : '0' }));

    userPool.signUp(getVal('email'), getVal('password'), attributeList, null, (err, result) => {
        if (err) {
            console.log(err.message || JSON.stringify(err));
            alert(err.message || JSON.stringify(err));
            return;
        }

        userEmailConfirm.userSub = result.userSub;
        alert('email confirm code sent');
    });
}

const signIn = () => {
    const authenticationDetails = new AuthenticationDetails(
        { Username: getVal('email1'), Password: getVal('password1') }
    );

    cognitoUser = new CognitoUser({ Username: getVal('email1'), Pool: userPool });
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {

            // please keep tokens safe
            // idToken is required for the access to a protected api
            const idToken = result.getIdToken().getJwtToken();
            const accessToken = result.getAccessToken().getJwtToken();

            const parsedIdTokenPayload = parseJwt(idToken);
            const userRole = parsedIdTokenPayload['custom:role'];
            const userName = parsedIdTokenPayload['name'];

            if (userRole === 'coach') {
                console.log(`Hello coach ${userName}`);
            } else {
                console.log(`Hello ${userName}`);
            };

            // console.log(`idToken\n${idToken}`);
            // console.log(`accessToken\n${accessToken}`);

            alert('Sign In Successful', 'success',);
        },

        onFailure: (err) => {
            alert(err.message || JSON.stringify(err, null, 2), 'danger');
        },
    });
}

const signOut = () => {
    cognitoUser.signOut();
    document.getElementById('sign-in-form').classList.remove('was-validated');
    domEls.email1.value = '';
    domEls.password1.value = '';
    alert('Signed Out.', 'success');
}

const codeRegistration = async () => {
    // user does not sign up email to cognito
    if (!userEmailConfirm.userSub) {
        alert('send confirm code first', 'danger');
        return;
    }
    // solution pending: if a user closes the page between signUp and codeRegistration steps
    // as he comes back, it cause user info lost and userEmailConfirm.userSub will also be null

    const confirmationCode = getVal('confirmCode');

    if (!confirmationCode) {
        alert('email confirm code required', 'danger');
        return;
    }

    cognitoUser = new CognitoUser({ Username: userEmailConfirm.userSub, Pool: userPool });
    cognitoUser.confirmRegistration(confirmationCode, true, function (err, result) {
        if (err) {
            alert(err);
            return;
        }

        userEmailConfirm.isUserConfirmed = true;
        alert('Sign Up Successful!', 'success');

        // auto signin after sign up
        domEls.email1.value = getVal('email');
        domEls.password1.value = getVal('password');
        signIn();
    });
}

const resendCode = async () => {
    if (userEmailConfirm.isUserConfirmed) {
        alert('this email has code confirmed already', 'danger');
        return;
    }

    if (!userEmailConfirm.userSub) {
        alert('send confirm code first', 'danger');
        return;
    }

    const command = new ResendConfirmationCodeCommand({ ClientId: POOL_DATA.ClientId, Username: userEmailConfirm.userSub });
    const client = new CognitoIdentityProviderClient({ region: CONFIG.Region });

    try {
        await client.send(command);
    } catch {
        alert('resend failed', 'danger');
        return;
    }

    alert('email confirm code sent');
}
