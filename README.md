# ssc-backend-for-frontend
non credential code share with frontend

1. setup `POOL_DATA` in the "./web-ui-js/custom-ui-cognito-env.js"
2. install dependency by `npm i`
3. esbuild the "./web-ui-js/custom-ui-cognito.js" to the public folder:
```
./node_modules/esbuild/bin/esbuild ./web-ui-js/custom-ui-cognito.js --bundle --minify --sourcemap --define:global=window --target=chrome90,firefox90,safari15 > ./public/custom-ui-cognito.js
```
4. upload the .js and .html files in public folder to a static website hosting, for example cloudfront + s3
5. for access to the protected api, check template `access-protected-template.js`
