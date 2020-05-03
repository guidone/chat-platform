const _ = require('underscore');

const _storeUserIds = {};
const Sequelize = require('sequelize');
const { QueryTypes } = require('sequelize');
const fs = require('fs');
const lcd = require('../lib/lcd');

const Op = Sequelize.Op;

const isEmpty = value => value == null || value === '';




function SQLiteStore(chatId, userId, statics = {}) {
  this.chatId = String(chatId);
  this.userId = String(userId);
  // make sure userId is always a string
  this.statics = Object.assign({}, statics, { userId: statics.userId != null ? String(statics.userId) : undefined  });
  if (_.isEmpty(statics)) {
    console.trace('Warning: empty statics vars')
  }
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

  this.getOrCreate = async function(chatId, userId, statics) {
    if (isEmpty(chatId) && isEmpty(userId)) {
      return null;
    }
    // just create an class that just wraps chatId and userId, add static value (cline)
    const store = new SQLiteStore(chatId, userId, { ...statics });
    return store;
  };
  this.get = function(chatId, userId, statics) {
    return new SQLiteStore(chatId, userId, statics);
  };
  this.assignToUser = async (userId, context) => {
    console.log('context',context);
    console.log('userid', userId)

    console.log('errore', erroro)
  };
  this.reset = async () => {
    await Context.destroy({ where: {} });
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
  },
  reset() {
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
