import { TOKEN_CONFIG } from './code-token-exchange-env';

class AuthService {
    constructor() {
        this.authEndpoint = TOKEN_CONFIG.AUTH_ENDPOINT;
        this.tokenEndpoint = TOKEN_CONFIG.TOKEN_ENDPOINT;
        this.clientId = TOKEN_CONFIG.CLIENT_ID;
        this.redirectUri = TOKEN_CONFIG.REDIRECT_URI; // url for code-token exchange and must be pre-registered the URI with the client
        this.codeVerifier = '';
        this.state = ''; // the string format base64
        this.scope = TOKEN_CONFIG.SCOPE; // each scope must be separated with a space
        this.identity_provider = 'Google';
    }

    async initiateLogin() {
        this.codeVerifier = this.generateRandomString();
        const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
        this.state = this.generateRandomString();

        // Store codeVerifier and state
        sessionStorage.setItem('codeVerifier', codeVerifier);
        sessionStorage.setItem('state', state);

        const authUrl = new URL(this.authEndpoint);
        authUrl.searchParams.append('response_type', 'code'); // Must be 'code' or 'token'
        authUrl.searchParams.append('client_id', this.clientId);
        authUrl.searchParams.append('redirect_uri', this.redirectUri);
        authUrl.searchParams.append('state', this.state);
        authUrl.searchParams.append('scope', this.scope);
        authUrl.searchParams.append('code_challenge_method', 'S256'); // Cognito only support S256
        authUrl.searchParams.append('code_challenge', codeChallenge);
        authUrl.searchParams.append('identity_provider', this.identity_provider);

        window.location.href = authUrl.toString();
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
        // this.saveTokens(tokens);
        return tokens;
    }

    // saveTokens(tokens) {
    //     sessionStorage.setItem('access_token', tokens.access_token);
    //     sessionStorage.setItem('refresh_token', tokens.refresh_token);
    //     sessionStorage.setItem('id_token', tokens.id_token);
    // }

    // getIdToken() {
    //     return sessionStorage.getItem('id_token');
    // }

    // getAccessToken() {
    //     return sessionStorage.getItem('access_token');
    // }

    generateRandomString() {
        const array = new Uint32Array(28 / 2); // string length is 28
        window.crypto.getRandomValues(array);
        const randomHexString = Array.from(array, (dec) => {
            return ('0' + dec.toString(16)).slice(-2)
        }).join('');
        return randomHexString;
    }

    async generateCodeChallenge(verifier) {
        hashed = await this.sha256(verifier);
        base64encoded = this.base64urlencode(hashed);
        return base64encoded;
    }

    sha256(plain) { // returns promise ArrayBuffer
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        return window.crypto.subtle.digest('SHA-256', data);
    }

    base64urlencode(a) {
        // Convert the ArrayBuffer to string using Uint8 array.
        // btoa takes chars from 0-255 and base64 encodes.
        // Then convert the base64 encoded to base64url encoded.
        // (replace + with -, replace / with _, trim trailing =)
        return btoa(String.fromCharCode.apply(null, new Uint8Array(a)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
}

const authService = new AuthService();

// Start login process
await authService.initiateLogin();

// In your callback route
// AuthService is required
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (code && state) {
    const authServiceToken = new AuthService();

    try {
        const tokens = await authServiceToken.handleCallback(code, state);
        console.log('Logged in successfully', `idToken=\n${tokens.id_token}\naccessToken=\n${tokens.access_token}`);
    } catch (error) {
        console.error('Login failed', error);
    }
}
