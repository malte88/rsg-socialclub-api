const OUTPUT_BEARER = false;
var first_start = true;
const {
  api_port,
  login_port,
  debug_mode,
  restart_on_error,
} = require('./config.json');
const vanillaPuppeteer = require('puppeteer');
const { addExtra } = require('puppeteer-extra');
const puppeteer = addExtra(vanillaPuppeteer);
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const logger = require('./logger.js');
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin());
puppeteer.use(
  require('puppeteer-extra-plugin-block-resources')({
    blockedTypes: new Set(['image', 'other']),
  })
);
const UserAgent = require('user-agents');
const schedule = require('node-schedule');
const express = require('express');
const app = express();
var clc = require('cli-color');

var bearer = '';

async function login() {
  let url = 'https://signin.rockstargames.com/signin/user-form?cid=socialclub';

  debugConsole('Started login process...');
  let PortalPlugin = require('puppeteer-extra-plugin-portal');
  puppeteer.use(
    PortalPlugin({
      webPortalConfig: {
        listenOpts: {
          port: login_port,
        },
        baseUrl: 'http://127.0.0.1',
      },
    })
  );
  debugConsole('Trying to start browser...');
  const browser = await puppeteer.launch({
    userDataDir: '/scapi/browser_data',
    headless: true,
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-sandbox',
    ],
  });
  debugConsole('Started browser...');
  const page = await browser.newPage();
  debugConsole('Started new tab...');

  const userAgent = new UserAgent();
  await page.setUserAgent(userAgent.toString());

  debugConsole('Navigating to ' + url);
  await page.goto(url, {
    waitUntil: 'networkidle0',
  });
  debugConsole(`Loaded Page`);
  let portalUrl = await page.openPortal();
  portalUrl = portalUrl.replace('http://127.0.0.1', '');
  portalUrl = 'http://127.0.0.1:' + login_port + portalUrl;
  logConsole('Started portal on: ' + portalUrl);
  logConsole(
    'Login with your socialclub credentials and dont forget to tick remember me box'
  );
  logConsole("Restart the app when you're done.");
}

async function reloadBearer() {
  let url = 'https://socialclub.rockstargames.com/';

  const browser = await puppeteer.launch({
    userDataDir: '/scapi/browser/data',
    headless: true,
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-sandbox',
    ],
  });
  const page = await browser.newPage();

  const userAgent = new UserAgent();
  await page.setUserAgent(userAgent.toString());

  debugConsole('Navigating to ' + url);
  await page.goto(url, {
    waitUntil: 'networkidle2',
  });
  debugConsole(`Loaded Page`);

  var data = await page.cookies();
  browser.close();
  var index = -1;
  var val = 'BearerToken';
  var filteredObj = data.find(function (item, i) {
    if (item.name === val) {
      index = i;
      return i;
    }
  });

  try {
    bearer = data[index].value;
  } catch (ex) {
    if (first_start) {
      errorConsole('Error getting bearer, starting login.\n' + ex);
      login();
      return;
    } else {
      errorConsole('Error getting bearer, reloading.\n' + ex);
      reloadBearer();
      return;
    }
  }
  first_start = false;

  checkUptime();

  if (OUTPUT_BEARER) {
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
const ansiStrip = require('cli-color/strip');
function debugConsole(text) {
  if (!debug_mode) return;
  let dateString = clc.yellow(new Date().toLocaleTimeString());
  console.log(`[${dateString}] [${clc.yellow('DEBUG')}] => ${text}`);
  logger.logger.log('info', `[${new Date().toLocaleTimeString()}] [DEBUG] => ${ansiStrip(text)}`);
}
function errorConsole(text) {
  let dateString = clc.yellow(new Date().toLocaleTimeString());
  console.log(`[${dateString}] [${clc.red('ERROR')}] => ${text}`);
  logger.logger.log('info', `[${new Date().toLocaleTimeString()}] [ERROR] => ${ansiStrip(text)}`);
}
function logConsole(text) {
  let dateString = clc.yellow(new Date().toLocaleTimeString());
  console.log(`[${dateString}] [${clc.greenBright('SUCCESS')}] => ${text}`);
  logger.logger.log('info', `[${new Date().toLocaleTimeString()}] [INFO] => ${ansiStrip(text)}`);
}

function parseJwt(token) {
  let base64Url = token.split('.')[1];
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  let jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );
  let payload = JSON.parse(jsonPayload);

  return { payload };
}

async function setTimer(expires) {
  let theDate = new Date(expires * 1000);
  date = theDate.toLocaleTimeString();

  let currentDate = new Date().getTime();

  if (theDate.getTime() < currentDate) {
    reloadBearer();
    return;
  }

  debugConsole('Setting timer at ' + clc.yellow(date));
  const job = schedule.scheduleJob(theDate, function () {
    debugConsole(`calling reloadBearer()`);
    reloadBearer();
  });
}

logConsole('Starting...');

reloadBearer();

const request = require('request');

app.get('/api/getProfile/', (req, res) => {
  let accountname = req.query.name;
  let maxFriends = req.query.maxFriends;
  if (!accountname) {
    res.statusCode = 400;
    res.send({
      error: 'Please specify an name',
      status: 400,
    });
    return;
  }
  if (!maxFriends) maxFriends = '0';
  logConsole(`Request for ${clc.yellow(accountname)}`);

  let options = {
    url:
      'https://scapi.rockstargames.com/profile/getprofile?nickname=' +
      accountname +
      '&maxFriends=' +
      maxFriends,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Authorization: 'Bearer ' + bearer,
    },
  };

  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      try {
        let info = JSON.parse(body);
        debugConsole(info);
        let resInfo = info.accounts[0];
        res.statusCode = 200;
        res.send(resInfo);
        let ok = clc.green('200/OK');
        logConsole(`Request status ${ok}`);
      } catch (err) {
        res.statusCode = 400;
        res.send({
          error: 'The player does not exist',
        });
        let fail = clc.red(res.statusCode + '/FAIL');
        logConsole(`Request status ${fail}`);
      }
    } else {
      res.statusCode = response.statusCode;
      res.send({
        error: 'An error occured, try again in a few seconds',
      });
      let fail = clc.red(res.statusCode + '/FAIL');
      logConsole(`Request status ${fail}`);
    }
  });
});

app.listen(api_port, () =>
  logConsole(`Alive on Port: ${clc.yellow(api_port)}`)
);

process.on('uncaughtException', function (err) {
  errorConsole(err);
  if (restart_on_error) {
    process.exitCode = 1;
    process.exit();
  }
});
