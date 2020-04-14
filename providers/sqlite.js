const _ = require('underscore');
const _store = {};
const _storeUserIds = {};
const Sequelize = require('sequelize');

const Op = Sequelize.Op;

const isEmpty = value => value == null || value === '';

const sequelize = new Sequelize('mission_control', '', '', {
  host: 'localhost',
  dialect: 'sqlite',
  //storage: dbPath,
  storage: '/Users/guibel/web/node-red-contrib-chatbot-mission-control/mission-control.sqlite',
  logging: false
});

const Context = sequelize.define('context', {
  userId: { type: Sequelize.STRING, allowNull: false },
  chatId: { type: Sequelize.STRING, allowNull: false },
  payload: { type: Sequelize.STRING, allowNull: false }
}, {
  indexes: [
    { name: 'chatid_userid', using: 'BTREE', fields: ['userId'] },
    { name: 'chatid_chatid', using: 'BTREE', fields: ['chatId'] }
  ]
});


function SQLiteStore(chatId, userId, defaults) {
  this.chatId = String(chatId);
  this.userId = String(userId);
  //this._context = _.clone(defaults || {});

  // TODO store defaults

  return this;
}
_.extend(SQLiteStore.prototype, {
  async get(key) {
    //console.log('[GET]', key)
    const keys = Array.from(arguments);

    const { payload } = await this.getPayload();
    //console.log('key', key, 'payload', payload)
    if (keys.length === 1) {
      return payload[key] != null ? payload[key] : null;
    }
    const result = {};
    keys.forEach(key => result[key] = payload[key]);
    //console.log('get -> ', result);
    return result;
  },
  async remove() {
    const keys = Array.from(arguments);
    const { id, payload } = await this.getPayload();
    keys.forEach(key => {
      // eslint-disable-next-line prefer-reflect
      delete payload[key];
    });
    await Context.update({ payload: JSON.stringify(payload) }, { where: { id }});
    return this;
  },

  async getPayload() {

    const contexts = await Context.findAll({ where: {
      [Op.or]: [
        { chatId: this.chatId },
        { userId: this.userId }
      ]
    }});
    //console.log('get payload', this.chatId, this.userId)
    //console.log('CCCC, contexts', contexts.length);

    const context = contexts[0];

    //console.log('content', context.toJSON())

    let payload;
    try {
      payload = JSON.parse(context.payload);
    } catch(e) {
      // default if error
      payload = {};
    }

    return { payload, id: context.id };
  },

  async set(key, value) {
    // console.log('[SET]', key, value)
    let { id, payload } = await this.getPayload();


    if (_.isString(key)) {
      payload[key] = value;
    } else if (_.isObject(key)) {
      payload = { ...payload, ...key };
    }

    await Context.update({ payload: JSON.stringify(payload) }, { where: { id }});



    return this;
  },
  async dump() {
    const { payload } = await this.getPayload();
    // eslint-disable-next-line no-console
    console.log(payload);
  },
  async all() {
    const { payload } = await this.getPayload();
    return payload;
  },
  async clear() {
    const { id } = await this.getPayload();
    await Context.update({ payload: JSON.stringify({}) }, { where: { id }})
    return this;
  }
});

function SQLiteFactory() {

  this.getOrCreate = async function(chatId, userId, defaults) {
    if (isEmpty(chatId) && isEmpty(userId)) {
      return null;
    }

    //console.log('get or create', chatId, userId)
    //console.log('defaults', defaults)

    /*const contexts = await Context.findAll({ where: {
      [Op.or]: [
        { chatId: String(chatId) },
        { userId: String(userId) }
      ]
    }});*/

    //console.log('contexts', contexts)

    // TODO get the right context
    //const contextId = contexts[0].id


    const store = new SQLiteStore(chatId, userId, { ...defaults });



    return store;
    //const chatContext = this.get(chatId, userId);
    /*if (chatContext == null) {

      _store[chatId] = memoryStore;
      if (!isEmpty(userId)) {
        _storeUserIds[userId] = memoryStore;
      }
      return _store[chatId];
    }
    return chatContext;*/
  };
  this.get = function(chatId, userId) {
    /*if (!isEmpty(chatId) && _store[chatId] != null) {
      return _store[chatId];
    } else if (!isEmpty(userId) && _storeUserIds[userId] != null) {
      return _storeUserIds[userId];
    }
    return null;
    */

    return new SQLiteStore(chatId, userId);
  };

  return this;
}
_.extend(SQLiteFactory.prototype, {
  name: 'SQLite',
  description: 'sqlite tbd',
  get: function(/*chatId, userId*/) {
  },
  getOrCreate: function(/*chatId, userId, defaults*/) {
  },
  assignToUser(userId, context) {
    // when merging a user into another, this trasnfer the current context to another user
    // TODO perhaps remove other occurence
    _storeUserIds[userId] = context;
  },
  reset() {
    // TODO implement reset

    //Object.keys(_store).forEach(key => delete _store[key]);
    //Object.keys(_storeUserIds).forEach(key => delete _storeUserIds[key]);
    return this;
  },
  stop: function() {
    return new Promise(function(resolve) {
      resolve();
    });
  },
  start: function() {
    return new Promise(function(resolve) {
      resolve();
    });
  }
});


module.exports = SQLiteFactory;
