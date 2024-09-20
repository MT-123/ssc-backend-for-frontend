import { AUTH_CONFIG } from './idp-google-login-env';

class AuthService {
    constructor() {
        this.authEndpoint = AUTH_CONFIG.AUTH_ENDPOINT;
        this.clientId = AUTH_CONFIG.CLIENT_ID;
        this.redirectUri = AUTH_CONFIG.REDIRECT_URI; // url for code-token exchange and must be pre-registered the URI with the client
        this.codeVerifier = '';
        this.state = ''; // the string format base64
        this.scope = AUTH_CONFIG.SCOPE; // each scope must be separated with a space
        this.identity_provider = AUTH_CONFIG.IDP;
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
