# RockstarGames Socialclub API

### This was build using nodejs v16.17.1

Get Profileinfo for RockstarGames profiles with your selfhosted API

### Setup:
```
git clone https://github.com/jdjdpsjsjdlsk/rsg-socialclub-api.git
cd rsg-socialclub-api
npm install
```

For the first start open config.json and fill SC_EMAIL and SC_PASSWD with your socialclub credentials for automatic login.

Start the script with `npm run start` or `node .` and wait for the message that says login complete.

Stop the script and set SC_LOGIN in .env file to false now just start and let it run to always get fresh bearertoken.

To test the api go to `http://localhost:4000/api/getProfile/name=<profilename>` if you use the standard port.
Optionally you could add `&maxFriends=<maxfriends>` to the request to limit the max amount of friends to be sent.

### I also have an Discordbot for use with this API https://github.com/jdjdpsjsjdlsk/discordbot-for-scapi
