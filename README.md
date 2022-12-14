# RockstarGames Socialclub API

### This was build using nodejs v16.17.1

Get Profileinfo for RockstarGames profiles with your selfhosted API

Setup:
```
git clone https://github.com/jdjdpsjsjdlsk/rsg-socialclub-api.git
cd rsg-socialclub-api
npm install dotenv puppeteer node-schedule express request
```

or if you already have it downloaded:

```
npm install dotenv puppeteer node-schedule express request
```

For the first start go into .env file and set SC_LOGIN to true and specify a Port for the API to use.

Start the script with `npm run start` or `node .` and login to the browser window that opens and make sure to check Remember Me to stay logged in.

Stop the script and set SC_LOGIN back to false now just start and let it run to always get fresh bearertoken.

To test the api go to `http://localhost:4000/api/getProfile/name=<profilename>` if you use the standart port
