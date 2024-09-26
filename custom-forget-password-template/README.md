There are 2 steps for forgot password process
1. user go to forgot-password page and click 'Reset my password' button to get a reset email and will be redirected to reset-password page
2. user enter code from reset email and the new password to set password

build command
```
./node_modules/esbuild/bin/esbuild ./web-ui-js/FILE_NAME.js --bundle --minify --sourcemap --define:global=window --target=chrome90,firefox90,safari15 > ./public/FILE_NAME.js
```
