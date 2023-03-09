# RockstarGames Socialclub API

### This was build using nodejs v16.17.1

Get Profileinfo for RockstarGames profiles with your selfhosted API

### I also have an Discordbot for use with this API https://github.com/malte843/discordbot-for-scapi

### Setup:
```
git clone https://github.com/malte843/rsg-socialclub-api.git
cd rsg-socialclub-api
npm install
```

Start the script with `npm run start` or `node .` and wait for the message that says portal started.
Visit the provided link, login and restart the app.

Stop the script and set SC_LOGIN in config file to false now just start and let it run to always get fresh bearertoken.

To test the api go to `http://localhost:4000/api/getProfile?name=<profileName>` if you use the standard port.
Optionally you could add `&maxFriends=<maxfriends>` to the request to limit the max amount of friends to be sent.
