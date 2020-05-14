const _ = require('underscore');
const _store = {};
const _storeUserIds = {};

const isEmpty = value => value == null || value === '';

function MemoryStore(chatId, userId, statics = {}) {
  this.chatId = chatId != null ? String(chatId) : null;
  this.userId = userId != null ? String(userId) : null;
  // make sure userId is always a string
  this.statics = Object.assign({}, statics, { userId: statics.userId != null ? String(statics.userId) : undefined  });
  if (_.isEmpty(statics)) {
    console.trace('Warning: empty statics vars')
  }
  return this;
}
_.extend(MemoryStore.prototype, {
  getPayload() {
    // always precedence to userId
    if (this.userId != null && _storeUserIds[this.userId] != null) {
      return _storeUserIds[this.userId];
    } else if (this.chatId != null && _store[this.chatId] != null) {
      return _store[this.chatId];
    } else if (this.userId != null) {
      _storeUserIds[this.userId] = {};
      return _storeUserIds[this.userId];
    } else if (this.chatId != null) {
      _store[this.chatId] = {};
      return _store[this.chatId];
    }
    return {};
  },
  get(key) {
    const keys = Array.from(arguments);
    const payload = this.getPayload();

    if (keys.length === 1) {
      if (this.statics[keys[0]] != null) {
        return this.statics[keys[0]];
      } else {
        return payload[key] != null ? payload[key] : null;
      }
    }
    const result = {};
    keys.forEach(key => {
      if (this.statics[key] != null) {
        result[key] = this.statics[key];
      } else {
        result[key] = payload[key];
      }
    });
    return result;
  },
  remove() {
    const keys = Array.from(arguments);
    const payload  = this.getPayload();
    keys.forEach(key => {
      // eslint-disable-next-line prefer-reflect
      delete payload[key];
    });
    return this;
  },
  set(key, value) {
    let payload = this.getPayload();
    const staticKeys = Object.keys(this.statics);
    if (_.isString(key) && staticKeys.includes(key)) {
      console.log(`Warning: try to set a static key: ${key}`);
    } else if (_.isObject(key) && _.intersection(staticKeys, Object.keys(key)).length !== 0) {
      console.log(`Warning: try to set a static keys: ${_.intersection(staticKeys, Object.keys(key)).join(', ')}`);
    }
    // store values, skipping static keys
    if (_.isString(key) && !staticKeys.includes(key)) {
      payload[key] = value;
    } else if (_.isObject(key)) {
      payload = { ...payload, ..._.omit(key, staticKeys) };
    }
    // store the payload back
    if (this.userId != null) {
      _storeUserIds[this.userId] = payload;
    } else if (this.chatId != null) {
      _store[this.chatId] = payload;
    }
    return this;
  },
  dump() {
    const payload = this.getPayload();
    // eslint-disable-next-line no-console
    console.log(payload);
  },
  all() {
    const payload = this.getPayload();
    return payload;
  },
  clear() {
    if (this.userId != null) {
      _storeUserIds[this.userId] = {};
      _store[this.chatId] = null;
    } else if (this.chatId != null) {
      _store[this.chatId] = {};
      _storeUserIds[this.userId] = null;
    }
    return this;
  }
});

function MemoryFactory() {

  this.getOrCreate = function(chatId, userId, statics) {
    if (isEmpty(chatId) && isEmpty(userId)) {
      return null;
    }
    // just create an class that just wraps chatId and userId, add static value (cline)
    const store = new MemoryStore(chatId, userId, { ...statics });
    return store;
    /*const chatContext = this.get(chatId, userId);
    if (chatContext == null) {
      const memoryStore = new MemoryStore({ ...defaults });
      _store[chatId] = memoryStore;
      if (!isEmpty(userId)) {
        _storeUserIds[userId] = memoryStore;
      }
      return _store[chatId];
    }
    return chatContext;
    */
  };
  this.get = function(chatId, userId, statics) {
    /*if (!isEmpty(chatId) && _store[chatId] != null) {
      return _store[chatId];
    } else if (!isEmpty(userId) && _storeUserIds[userId] != null) {
      return _storeUserIds[userId];
    }
    return null;*/
    return new MemoryStore(chatId, userId, { ...statics });
  };

  return this;
}
_.extend(MemoryFactory.prototype, {
  name: 'Memory',
  description: 'Memory context provider, it\' fast and synchronous but it doesn\'t persists the values, once the'
    + ' server is restarted all contexts are lost. It doesn\'t requires any parameters. Good for testing.',
  get: function(/*chatId, userId*/) {
  },
  getOrCreate: function(/*chatId, userId, statics*/) {
  },
  assignToUser(userId, context) {
    // when merging a user into another, this trasnfer the current context to another user
    // TODO perhaps remove other occurence
    _storeUserIds[userId] = context;
  },
  reset() {
    Object.keys(_store).forEach(key => delete _store[key]);
    Object.keys(_storeUserIds).forEach(key => delete _storeUserIds[key]);
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


module.exports = MemoryFactory;
