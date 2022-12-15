require("dotenv").config();
const fs = require("fs");
const puppeteer = require("puppeteer");
const schedule = require("node-schedule");
const express = require("express");
const app = express();
var clc = require("cli-color");

var url = "";
var sc_login = false;
var headless = true;
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

if (process.env.HEADLESS === "true") {
  headless = true;
} else {
  headless = false;
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
    headless: headless,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36"
  );

  await page.goto(url, {
    waitUntil: "networkidle2",
  });
  debugConsole(`Loaded Page`);

  if (sc_login) {
    const passwd = process.env.SC_PASSWD;
    const email = process.env.SC_EMAIL;

    //[name='email'][type='email']
    await page.type("input[name=email]", email);
    //[name='password'][type='password']
    await page.type("input[name=password]", passwd);
    //[name='keepMeSignedIn']
    await page.click("[name=keepMeSignedIn]");
    //.loginform__submitField__NdeFI .loginform__submitActions__dWo_j .UI__Button-socialclub__btn
    //await page.click("#onetrust-button-group-parent #onetrust-button-group #onetrust-accept-btn-handler");
    await Promise.all([
      await page.click(
        ".loginform__submitField__NdeFI .loginform__submitActions__dWo_j .UI__Button-socialclub__btn"
      ),
      await (await page.$("input[name=password]")).press("Enter"),
      page.waitForNavigation({ waitUntil: "networkidle0" }),
    ]);
    logConsole(
      "Logged in! Set SC_LOGIN in .env back to false and restart the Application."
    );
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

  if (showbearer) {
    logConsole(bearer);
  }

  const { payload } = parseJwt(bearer);
  var expires = payload.exp;

  var theDate = new Date(expires * 1000);
  dateString = theDate.toLocaleTimeString();

  const currentDate = new Date().getTime();

  if (expires < currentDate) {
  }

  logConsole(`Got new Bearer that is valid till ${clc.yellow(dateString)}`);
  debugConsole(
    `Token expires: ${clc.yellow(expires)} / ${clc.yellow(dateString)}`
  );

  setTimer(expires);
}

function debugConsole(text) {
  if (debug) {
    var dateString = clc.yellow(new Date().toLocaleTimeString());
    console.log(`[${dateString}] [${clc.yellow("DEBUG")}] => ${text}`);
  }
}
function errorConsole(text) {
  var dateString = clc.yellow(new Date().toLocaleTimeString());
  console.log(`[${dateString}] [${clc.red("ERROR")}] => ${text}`);
}
function logConsole(text) {
  var dateString = clc.yellow(new Date().toLocaleTimeString());
  console.log(`[${dateString}] [${clc.yellow("API")}] => ${text}`);
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

async function setTimer(expires) {
  var theDate = new Date(expires * 1000);
  date = theDate.toLocaleTimeString();

  const currentDate = new Date().getTime();

  debugConsole(
    `Expires: ${clc.yellow(theDate.getTime())}, now is: ${clc.yellow(
      currentDate
    )}`
  );

  if (theDate.getTime() < currentDate) {
    reloadBearer();
    return;
  }

  debugConsole("Setting timer at " + clc.yellow(date));
  const job = schedule.scheduleJob(theDate, function () {
    debugConsole(`calling reloadBearer()`);
    reloadBearer();
  });
}

reloadBearer();

const request = require("request");

app.get("/api/getProfile/name=:name&maxFriends=:maxFriends", (req, res) => {
  const accountname = req.params.name;
  const maxFriends = req.params.maxFriends;
  logConsole(`Request for ${clc.yellow(accountname)}`);
  const options = {
    url:
      "https://scapi.rockstargames.com/profile/getprofile?nickname=" +
      accountname +
      "&maxFriends=" +
      maxFriends,
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      Authorization: "Bearer " + bearer,
    },
  };

  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      try {
        const info = JSON.parse(body);
        debugConsole(info);
        const resInfo = info.accounts[0];
        res.statusCode = 200;
        res.send(resInfo);
        const ok = clc.green("200/OK");
        logConsole(`Request status ${ok}`);
      } catch (err) {
        res.statusCode = 500;
        res.send({
          error: "The player does not exist",
        });
        const fail = clc.red(res.statusCode + "/FAIL");
        logConsole(`Request status ${fail}`);
      }
    } else {
      res.statusCode = response.statusCode;
      res.send({
        error: "An error occured, try again in a few seconds",
      });
      logConsole(`Request status ${res.statusCode}/FAIL`);
    }
  });
});

app.get("/api/getProfile/name=:name", (req, res) => {
  const accountname = req.params.name;
  logConsole(`Request for ${clc.yellow(accountname)}`);
  const options = {
    url:
      "https://scapi.rockstargames.com/profile/getprofile?nickname=" +
      accountname,
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      Authorization: "Bearer " + bearer,
    },
  };

  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      try {
        const info = JSON.parse(body);
        debugConsole(info);
        const resInfo = info.accounts[0];
        res.statusCode = 200;
        res.send(resInfo);
        const ok = clc.green("200/OK");
        logConsole(`Request status ${ok}`);
      } catch (err) {
        res.statusCode = 500;
        res.send({
          error: "The player does not exist",
        });
        const fail = clc.red(res.statusCode + "/FAIL");
        logConsole(`Request status ${fail}`);
      }
    } else {
      res.statusCode = response.statusCode;
      res.send({
        error: "An error occured, try again in a few seconds",
      });
      logConsole(`Request status ${res.statusCode}/FAIL`);
    }
  });
});

var api_port = parseInt(process.env.API_PORT);
if (!sc_login) {
  app.listen(api_port, () =>
    logConsole(`Alive on Port: ${clc.yellow(api_port)}`)
  );
}

process.on("uncaughtException", function (err) {
  errorConsole(err);
  logConsole("Node NOT Exiting...");
});
