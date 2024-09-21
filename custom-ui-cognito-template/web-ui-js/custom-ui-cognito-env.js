export const poolData = {
    userPoolId: '',
    clientId: '',
    domian: '',
    region: 'ap-northeast-1'
};

export const idpGoogle = {
    idp: 'Google',
    scope: 'openid profile email aws.cognito.signin.user.admin',
    redirectUri: '' // redirect url for code-token exchange and must be pre-registered the URI with the client
};
