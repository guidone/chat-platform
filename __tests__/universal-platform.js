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
  let chatServerAlt = null;
  let sendFunction = null;

  beforeEach(() => {
    // Fake chat server
    sendFunction = chai.spy(() => { });
    chatServer = Universal.createServer({
      contextProvider: contextProviders.getProvider('memory'),
      debug: false
    });
    chatServer.onUserId(payload => payload.user.id);
    chatServer.onChatId(payload => payload.chat_id);
    chatServer.onMessageId(payload => payload._id);
    chatServer.onLanguage(payload =>payload.lang);
    chatServer.in(message => {
      return new Promise((resolve) => {
        const chat = message.chat();
        if (message.originalMessage.text != null) {
          chat.set('payload', message.originalMessage.text);
          message.payload.content = message.originalMessage.text;
          message.payload.type = 'message';
        }
        resolve(message);
      });
    });
    chatServer.use(message => new Promise((resolve, reject) => {
        message.custom_value = 42;
        resolve(message);
      })
    );
    chatServer.out('a-message-type', message => new Promise(resolve => {
        message.message_id = '444';
        sendFunction();
        resolve(message);
      })
    );
    // Alt fake server
    sendFunctionAlt = chai.spy(() => { });
    chatServerAlt = Universal.createServer({
      contextProvider: contextProviders.getProvider('memory'),
      transport: 'universal-alt',
      debug: false
    });
    chatServerAlt.onUserId(payload => payload.user.id);
    chatServerAlt.onChatId(payload => payload.chat_id);
    chatServerAlt.onMessageId(payload => payload._id);
    chatServerAlt.onLanguage(payload =>payload.lang);
    chatServerAlt.in(message => {
      return new Promise((resolve) => {
        const chat = message.chat();
        if (message.originalMessage.text != null) {
          chat.set('payload', message.originalMessage.text);
          message.payload.content = message.originalMessage.text;
          message.payload.type = 'message';
        }
        resolve(message);
      });
    });
    chatServerAlt.use(message => new Promise((resolve, reject) => {
        message.custom_value = 42;
        resolve(message);
      })
    );
    chatServerAlt.out('a-message-type', message => new Promise(resolve => {
        message.message_id = '445';
        sendFunctionAlt();
        resolve(message);
      })
    );
    // store the global resolver
    chatServer.onGetChatIdFromUserId((userId, transport, message) => {
      if (userId === '1234' && transport === 'universal') {
        return '42';
      } else if (userId === '1234' && transport === 'universal-alt') {
        return '43';
      }
      return null;
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

  it('create a message with just a userId and resolves it', () => {
    return chatServer.start()
      .then(() => chatServer.createMessage(null, '1234', '4567', {
        payload: {
          type: 'a-message-type'
        }
      }))
      .then(message => chatServer.send(message))
      .then(() => expect(sendFunction).to.have.been.called());
  });

  it('create a message with just a userId and doesn\'t resolve it', () => {
    return chatServer.start()
      .then(() => chatServer.createMessage(null, '5678', '4567', {
        payload: {
          type: 'a-message-type'
        }
      }))
      .then(message => chatServer.send(message))
      .then(
        () => {},
        e => {
          assert.include(e.toString(), 'Error: The userId<->chatId resolver was not able to find a valid chatId for user 5678');
          expect(sendFunction).to.not.have.been.called()
        }
      );
  });

  it('create a message with a server and just a userId and try to send to the other server', () => {
    return chatServer.start()
      .then(() => chatServer.createMessage(null, '1234', '4567', {
        payload: {
          type: 'a-message-type'
        }
      }))
      .then(message => chatServerAlt.send(message))
      .then(() => expect(sendFunctionAlt).to.have.been.called());
  });


});
