const fs = require('fs');
const clc = require('cli-color');
const orange = clc.xterm(214);
const grey = clc.blackBright;
const green = clc.greenBright;
const red = clc.red;

const ChatExpress = require('./chat-platform');
const ContextProviders = require('./chat-context-factory');
const ChatLog = require('./chat-log');
const UniversalPlatform = require('./universal');

const jsonPackage = fs.readFileSync(`${__dirname}/package.json`);
let version;
try {
  const pack= JSON.parse(jsonPackage);
  version = pack.version;
} catch(e) {
  // eslint-disable-next-line no-console
  console.log(red('Unable to open node-red-contrib-chatbot/package.json'));
}

// eslint-disable-next-line no-console
console.log(orange('Initializing chat-platform lib, you should see this only once'));
// eslint-disable-next-line no-console
console.log(grey('Running at: ' + __dirname) + ' Version: ' + green(version));
// eslint-disable-next-line no-console
console.log('');

module.exports = { ChatExpress, ContextProviders, ChatLog, UniversalPlatform };
