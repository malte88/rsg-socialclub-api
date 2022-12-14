require("dotenv").config();
const fs = require("fs");
const puppeteer = require("puppeteer");
const schedule = require("node-schedule");
const express = require("express");
const app = express();

var url = "";
var sc_login = false;
var debug = true;
var showbearer = false;
var bearer = "";

if (process.env.SC_LOGIN === "true") {
  sc_login = true;
  url = "https://signin.rockstargames.com/signin/user-form?cid=socialclub";
} else if (process.env.SC_LOGIN == "false") {
  sc_login = false;
  url = "https://socialclub.rockstargames.com/";
} else {
  process.exit();
}

if (process.env.DEBUG_MODE === "true") {
  debug = true;
} else {
  debug = false;
}

if (process.env.OUTPUT_BEARER === "true") {
  showbearer = true;
} else {
  showbearer = false;
}

async function reloadBearer() {
  apiDown = true;
  const browser = await puppeteer.launch({
    userDataDir: "./user_data",
    headless: !sc_login,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36"
  );

  await page.goto(url, {
    waitUntil: "networkidle2",
  });
  debugConsole("[API] => Loaded Page");

  if (sc_login) {
    return;
  }

  var data = await page.cookies();
  browser.close();
  var index = -1;
  var val = "BearerToken";
  var filteredObj = data.find(function (item, i) {
    if (item.name === val) {
      index = i;
      return i;
    }
  });

  //fs.writeFileSync("./cookies.json", JSON.stringify(data));
  bearer = data[index].value;
  console.log("[API] => Got new Bearer");

  if (showbearer) {
    console.log(bearer);
  }

  const { payload } = parseJwt(bearer);
  var expires = payload.exp;

  var theDate = new Date(expires * 1000);
  dateString = theDate.toLocaleTimeString();

  debugConsole("[API] => Token expires: " + expires + " / " + dateString);

  setTimer(theDate);
}

function debugConsole(text) {
  if (debug) {
    console.log(text);
  }
}

function parseJwt(token) {
  var base64Url = token.split(".")[1];
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  var jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );
  var payload = JSON.parse(jsonPayload);

  return { payload };
}

async function setTimer(date) {
  debugConsole("[API] => Setting timer at " + date.toLocaleTimeString());
  const job = schedule.scheduleJob(date, function () {
    debugConsole("calling reloadBearer()");
    reloadBearer();
  });
}

reloadBearer();

const request = require("request");

app.get("/api/getProfile/name=:name", (req, res) => {
  const accountname = req.params.name;
  console.log(`[API] => Request for ${accountname}`);
  const options = {
    url:
      "https://scapi.rockstargames.com/profile/getprofile?nickname=" +
      accountname +
      "&maxFriends=3",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      Authorization: "Bearer " + bearer,
    },
  };

  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      const info = JSON.parse(body);
      res.statusCode = 200;
      res.send(info.accounts[0]);
      console.log("[API] => Request status 200/OK");
    } else {
      console.log("[API] => Request failed " + response.statusCode);
      res.statusCode = response.statusCode;
      res.send({
        error: "An error occured, try again in a few seconds",
      })
      console.log(`[API] => Request status ${res.statusCode}/FAIL`);
    }
  });
});

var api_port = parseInt(process.env.API_PORT);

app.listen(api_port, () => console.log("[API] => Alive on Port: " + api_port));