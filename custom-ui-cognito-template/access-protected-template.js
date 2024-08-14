// this is a template of getting data from a protected api after
// the user has logged in and received an idToken

const requestUrl = ""; // the url of a protected api
const idToken = ""; // the string of the idToken
const myHeaders = new Headers();
// the header "Authorization" with idToken string must be attached to pass the api authorization
myHeaders.append("Authorization", idToken);

fetch(requestUrl, { method: "GET", headers: myHeaders })
    .then((response) => { console.log(response) })
    .catch((e) => { console.log('fetch failed\n', e) });
