const _ = require('underscore');

const _storeUserIds = {};
const Sequelize = require('sequelize');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const lcd = require('../lib/lcd');

const Op = Sequelize.Op;

const isEmpty = value => value == null || value === '';




function SQLiteStore(chatId, userId, defaults) {
  this.chatId = String(chatId);
  this.userId = String(userId);
  return this;
}

function SQLiteFactory(params) {
  params = params || {};
  if (_.isEmpty(params.dbPath)) {
    throw 'SQLite context provider: missing parameter "dbPath"';
  }
  if (!fs.existsSync(params.dbPath)) {
    throw 'SQLite context provider: "dbPath" (' + params.path + ') doesn\'t exist';
  }

  const sequelize = new Sequelize('mission_control', '', '', {
    host: 'localhost',
    dialect: 'sqlite',
    storage: params.dbPath,
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



  // **
  // Start definition if SQLite store, with closure I can spare passing a Context as configuration
  // fo the class
  // **
  _.extend(SQLiteStore.prototype, {
    async get(key) {
      const keys = Array.from(arguments);
      const { payload } = await this.getPayload();
      if (keys.length === 1) {
        return payload[key] != null ? payload[key] : null;
      }
      const result = {};
      keys.forEach(key => result[key] = payload[key]);
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
      // get payload using chatId or userId
      const contexts = await Context.findAll({ where: {
        [Op.or]: [
          { chatId: this.chatId },
          { userId: this.userId }
        ]
      }});
      let payload;
      let context;
      if (contexts.length === 0) {
        // if not present then create the row
        context = await Context.create({ payload: JSON.stringify({}), chatId: this.chatId, userId: this.userId });
        payload = {};
      } else {
        // if by any change there are two matched rows, one for the chatId and one for userId
        // always prefer the userId (that could happen if the user star using the sqlite provider) as
        // is and at some point the MC_store assign the context to the user
        context = contexts.find(context => context.userId === this.userId);
        if (context == null) {
          contexts.find(context => context.chatId === this.chatId);
        }
        // finally decode
        try {
          payload = JSON.parse(context.payload);
        } catch(e) {
          // default if error
          payload = {};
        }
      }
      return { payload, id: context.id };
    },

    async set(key, value) {
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
  // **
  // End definition if SQLite store
  // **

  this.getOrCreate = async function(chatId, userId, defaults) {
    if (isEmpty(chatId) && isEmpty(userId)) {
      return null;
    }
    // just create an class that just wraps chatId and userId
    const store = new SQLiteStore(chatId, userId, { ...defaults });
    return store;
  };
  this.get = function(chatId, userId) {
    return new SQLiteStore(chatId, userId);
  };
  this.start = async () => {
    /*
      To test dropping the table
      DROP TABLE "contexts";
      DROP INDEX "chatid_userid";
      DROP INDEX "chatid_chatid";
    */
    // if table doesn't exists, then create
    const tableExists = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='contexts';",
      { type: QueryTypes.SELECT }
    );
    const createTable = tableExists.length === 0;
    // create the table
    try {
      if (createTable) {
        await Context.sync();
      }
      // then log, don't move, keep the log lines together
      console.log(lcd.timestamp() + 'SQLite context provider configuration:');
      console.log(lcd.timestamp() + '  ' + lcd.green('dbPath: ') + lcd.grey(params.dbPath));
      if (createTable) {
        console.log(lcd.timestamp() + '  ' + lcd.green('database: ') + lcd.grey('table missing, created successfully'));
      } else {
        console.log(lcd.timestamp() + '  ' + lcd.green('database: ') + lcd.grey('OK'));
      }
    } catch(e) {
      lcd.dump(e, 'Something went wrong creating the SQLite "contexts" table');
      throw e;
    }

    return true;
  };

  return this;
}
_.extend(SQLiteFactory.prototype, {
  name: 'SQLite',
  description: 'SQLite context provider: chat context will be stored a SQLite file. Specify the path of *.sqlite file in the'
    + ' JSON config like this <pre style="margin-top: 10px;">\n'
    + '{\n'
    + '"dbPath": "/my-path/my-database.sqlite"\n'
    + '}</pre>'
    + '<br/> The table <em>context</em> will be automatically created.',
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
