const moment = require('moment');
const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;
const spies = require('chai-spies');
const RED = require('../lib/red-stub')();
const Universal = require('../universal');
const ContextProviders = require('../chat-context-factory');
const contextProviders = ContextProviders(RED);

chai.use(spies);

describe('Universal Connector', () => {

  let chatServer = null;
  let sendFunction = null;

  beforeEach(function() {
    sendFunction = chai.spy(function() { });
    chatServer = Universal.createServer({
      contextProvider: contextProviders.getProvider('memory'),
      debug: false
    });
    chatServer.onUserId(function(payload) {
      return payload.user.id;
    });
    chatServer.onChatId(function(payload) {
      return payload.chat_id;
    });
    chatServer.onMessageId(function(payload) {
      return payload._id;
    });
    chatServer.onLanguage(function(payload) {
      return payload.lang;
    });
    chatServer.in(function (message) {
      return new Promise(function(resolve, reject) {
        var chat = message.chat();
        if (message.originalMessage.text != null) {
          chat.set('payload', message.originalMessage.text);
          message.payload.content = message.originalMessage.text;
          message.payload.type = 'message';
        }
        resolve(message);
      });
    });
    chatServer.use(function (message) {
      return new Promise(function(resolve, reject) {
        message.custom_value = 42;
        resolve(message);
      });
    });
    chatServer.out('a-message-type', function(message) {
      return new Promise(function(resolve) {
        message.message_id = '444';
        sendFunction();
        resolve(message);
      });
    });
  });

  it('receive incoming message', () => {
    chatServer.start()
      .then(() => {
        chatServer.on('message', message => {
          assert.equal(message.payload.type, 'message');
          assert.equal(message.custom_value, 42);
          assert.equal(message.payload.chatId, '42');
          assert.equal(message.originalMessage.messageId, 'xyz');
          assert.equal(message.originalMessage.userId, 24);
          assert.isFunction(message.chat);
          const variables = message.chat().all();
          assert.equal(variables.payload, 'Bazinga');
          assert.equal(variables.transport, 'universal');
          assert.equal(variables.authorized, false);
          assert.equal(variables.language, 'it');
          assert.instanceOf(message.payload.ts, moment);
        });
        chatServer.receive({
          text: 'Bazinga',
          lang: 'it',
          chat_id: '42',
          _id: 'xyz',
          user: { id: 24 }
        });
      });
  });

  it('send outgoing message', () => {
    return chatServer.start()
      .then(() => chatServer.createMessage('42', '1234', '4567', {
        payload: {
          type: 'a-message-type',
          chatId: '42'
        }
      }))
      .then(message => chatServer.send(message))
      .then(message => {
        assert.equal(message.message_id, '444');
        expect(sendFunction).to.have.been.called();
      });
  });

  it('send outgoing message wrong type', () => {
    return chatServer.start()
      .then(() => chatServer.createMessage('42', '1234', '4567', {
        payload: {
          type: 'a-different-type',
          chatId: '42'
        }
      }))
      .then(message => chatServer.send(message))
      .then(() => expect(sendFunction).to.not.have.been.called());
  });

});
