import { CALLBACK_CONFIG } from './idp-callback-env';

class TokenService {
    constructor() {
        this.tokenEndpoint = CALLBACK_CONFIG.TOKEN_ENDPOINT;
        this.clientId = CALLBACK_CONFIG.CLIENT_ID;
        this.redirectUri = CALLBACK_CONFIG.REDIRECT_URI; // url for code-token exchange and must be pre-registered the URI with the client
    }

    async handleCallback(code, receivedState) {
        // Retrieve stored codeVerifier and state
        const codeVerifier = sessionStorage.getItem('codeVerifier');
        const originalState = sessionStorage.getItem('state');

        // Clear stored values
        sessionStorage.removeItem('codeVerifier');
        sessionStorage.removeItem('state');

        if (receivedState !== originalState) {
            throw new Error('Invalid state parameter');
        }

        const tokenResponse = await fetch(this.tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: this.clientId,
                code: code,
                code_verifier: codeVerifier,
                redirect_uri: this.redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to exchange code for token');
        }

        const tokens = await tokenResponse.json();

        return tokens;
    }
}

const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (code && state) {
    const tokenService = new TokenService();

    try {
        const tokens = await tokenService.handleCallback(code, state);

        // store tokens at browser
        // sessionStorage.setItem('access_token', tokens.access_token);
        // sessionStorage.setItem('refresh_token', tokens.refresh_token);
        // sessionStorage.setItem('id_token', tokens.id_token);

        console.log('Logged in successfully', `idToken=\n${tokens.id_token}\naccessToken=\n${tokens.access_token}`);
        window.location.href = CALLBACK_CONFIG.REDIRECT_URL_AFTER_TOKEN;

    } catch (error) {
        console.error('Login failed', error);
    }
}
