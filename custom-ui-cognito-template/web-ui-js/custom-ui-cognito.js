// modified from the template https://catalog.workshops.aws/wyld-pets-cognito/en-US/50-lab2-user-pools-sdk/51-initial-setup
import { AuthenticationDetails, CognitoUserPool, CognitoUser, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } from "@aws-sdk/client-cognito-identity-provider";
import { poolData, idpGoogle } from './custom-ui-cognito-env';

const domEls = {
    name: document.getElementById('floatingName') || {},
    email: document.getElementById('floatingEmail') || {},
    email1: document.getElementById('floatingEmail1') || {},
    password: document.getElementById('floatingPassword') || {},
    password1: document.getElementById('floatingPassword1') || {},
    confirmCode: document.getElementById('floatingCode') || {},
    prefix: document.getElementById('floatingPrefix') || {}
};
const subscribeCheck = document.getElementById('subscribeCheckbox');
const userPool = new CognitoUserPool({
    UserPoolId: poolData.userPoolId,
    ClientId: poolData.clientId
});
const userEmailConfirm = {
    userSub: null,
    isUserConfirmed: false
};
let cognitoUser;

const parseJwt = (token) => {
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

// for code token exchange when redirect from google sign in
const urlParams = new URLSearchParams(window.location.search);
const receivedCode = urlParams.get('code');
const receivedState = urlParams.get('state');

window.addEventListener('load', async () => {
    await codeTokenExchangeIdpGoogle();
}, { once: true });

/**
 * Configure some listeners when the DOM is ready
 */
(() => {
    'use strict'
    const signInForm = document.getElementById('sign-in-form');
    const signUpForm = document.getElementById('sign-up-form');
    const resendCodeForm = document.getElementById('resend-code-btn')
    const confirmCodeForm = document.getElementById('confirm-code-form')
    const signUpGoogleButton = document.getElementById('sign-up-google-btn')
    const signInGoogleButton = document.getElementById('sign-in-google-btn')

    signInForm.addEventListener('submit', (event) => {
        signInForm.classList.add('was-validated');
        event.preventDefault();
        event.stopPropagation();
        if (signInForm.checkValidity()) (event.submitter.innerText === 'Sign In') ? signIn() : signOut();
    }, false);

    signUpForm.addEventListener('submit', (event) => {
        signUpForm.classList.add('was-validated');
        event.preventDefault();
        event.stopPropagation();
        if (signUpForm.checkValidity()) signUp();
    }, false);

    confirmCodeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await codeRegistration();
    })

    resendCodeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await resendCode();
    })

    // sign up or sign in with Google
    signUpGoogleButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await initiateGoogleLogin();
    })

    signInGoogleButton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await initiateGoogleLogin();
    })
})()

// local sign up
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

// local sign in
const signIn = () => {
    const authenticationDetails = new AuthenticationDetails(
        { Username: getVal('email1'), Password: getVal('password1') }
    );

    cognitoUser = new CognitoUser({ Username: getVal('email1'), Pool: userPool });
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {

            // please keep tokens at a safe place
            const idToken = result.getIdToken().getJwtToken();
            const accessToken = result.getAccessToken().getJwtToken();
            const refreshToken = result.getRefreshToken().getToken();

            // const parsedIdTokenPayload = parseJwt(idToken);
            // const userRole = parsedIdTokenPayload['custom:role'];
            // const userName = parsedIdTokenPayload['name'];

            // if (userRole === 'coach') {
            //     console.log(`Hello coach ${userName}`);
            // } else {
            //     console.log(`Hello ${userName}`);
            // };

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

    const command = new ResendConfirmationCodeCommand({ ClientId: poolData.clientId, Username: userEmailConfirm.userSub });
    const client = new CognitoIdentityProviderClient({ region: poolData.region }); // region is required

    try {
        await client.send(command);
    } catch (e) {
        console.error(e);
        alert('resend failed', 'danger');
        return;
    }

    alert('email confirm code sent');
}

// sign in with google
const initiateGoogleLogin = async () => {
    const codeVerifier = generateRandomString();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomString(); // the state should be encoded by base64

    // Store codeVerifier and state
    sessionStorage.setItem('codeVerifier', codeVerifier);
    sessionStorage.setItem('state', state);

    const authUrl = new URL(`${poolData.domian}/oauth2/authorize`);
    authUrl.searchParams.append('response_type', 'code'); // Must be 'code' or 'token'
    authUrl.searchParams.append('client_id', poolData.clientId);
    authUrl.searchParams.append('redirect_uri', idpGoogle.redirectUri);
    // redirect url for code-token exchange and must be pre-registered the URI with the client
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('scope', idpGoogle.scope); // each scope must be separated with a space
    authUrl.searchParams.append('code_challenge_method', 'S256'); // Cognito only support S256
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('identity_provider', idpGoogle.idp);

    window.location.href = authUrl.toString();
}

const generateRandomString = () => {
    const arrayU32 = new Uint32Array(28 / 2); // string length is 28
    window.crypto.getRandomValues(arrayU32);
    const randomHexString = Array.from(arrayU32, (dec) => {
        return ('0' + dec.toString(16)).slice(-2)
    }).join('');
    return randomHexString;
}

const generateCodeChallenge = async (verifier) => {
    const hashed = await sha256(verifier);
    const base64encoded = base64urlencode(hashed);
    return base64encoded;
}

const sha256 = (plain) => { // returns promise ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

const base64urlencode = (a) => {
    // Convert the ArrayBuffer to string using Uint8 array.
    // btoa takes chars from 0-255 and base64 encodes.
    // Then convert the base64 encoded to base64url encoded.
    // (replace + with -, replace / with _, trim trailing =)
    return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}


const codeTokenExchangeIdpGoogle = async () => {
    if (receivedCode && receivedState) {
        try {
            const tokens = await getTokenByPKCE(receivedCode, receivedState);

            // store tokens at browser
            // sessionStorage.setItem('access_token', tokens.access_token);
            // sessionStorage.setItem('refresh_token', tokens.refresh_token);
            // sessionStorage.setItem('id_token', tokens.id_token);

            // please keep tokens at a safe place
            const idToken = tokens.id_token;
            const accessToken = tokens.access_token;
            const refreshToken = tokens.refresh_token;

            // const parsedIdTokenPayload = parseJwt(idToken);
            // const userRole = parsedIdTokenPayload['custom:role'];
            // const userName = parsedIdTokenPayload['name'];

            // if (userRole === 'coach') {
            //     console.log(`Hello coach ${userName}`);
            // } else {
            //     console.log(`Hello ${userName}`);
            // };

            // console.log(`idToken\n${idToken}`);
            // console.log(`accessToken\n${accessToken}`);

            alert('Sign In with Google Successful', 'success',);

        } catch (error) {
            console.error('Login failed', error);
        }
    }
    return;
}

const getTokenByPKCE = async (receivedCode, receivedState) => {
    // Retrieve stored codeVerifier and state
    const codeVerifier = sessionStorage.getItem('codeVerifier');
    const originalState = sessionStorage.getItem('state');

    // Clear stored values
    sessionStorage.removeItem('codeVerifier');
    sessionStorage.removeItem('state');

    if (!codeVerifier || !originalState) {
        throw new Error('Missing state or code verifier');
    }

    if (receivedState !== originalState) {
        throw new Error('Invalid state parameter');
    }

    const tokenResponse = await fetch(`${poolData.domian}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: poolData.clientId,
            code: receivedCode,
            code_verifier: codeVerifier,
            redirect_uri: idpGoogle.redirectUri,
        }),
    });

    if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
    }

    const tokens = await tokenResponse.json();

    return tokens;
}
