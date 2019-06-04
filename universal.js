const moment = require('moment');
const ChatExpress = require('./chat-platform');
const utils = require('./lib/utils');
const when = utils.when;
const _ = require('underscore');

const Universal = new ChatExpress({
  transport: 'universal',
  transportDescription: 'Universal Connector',
  chatIdKey(payload) {
    return payload.chatId;
  },
  userIdKey(payload) {
    return payload.userId;
  },
  tsKey() {
    return moment();
  },
  language() {
    return null;
  },
  onStart() {
    const options = this.getOptions();
    return _.isFunction(options._onStart) ? when(options._onStart()) : when(true);
  },
  onStop() {
    const options = this.getOptions();
    return _.isFunction(options._onStop) ? when(options._onStop()) : when(true);
  }
});


Universal.mixin({
  onStart(func) {
    const options = this.getOptions();
    options._onStart = func.bind(this);
    return this;
  },
  onStop(func) {
    const options = this.getOptions();
    options._onStop = func.bind(this);
    return this;
  }
});

module.exports = Universal;
