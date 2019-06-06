const _ = require('underscore');


const fs = require('fs');
const moment = require('moment');
const lcd = require('../helpers/lcd');
const { isEmpty } = require('../lib/utils');
const FileQueue = require('../helpers/promises-queue');
const filesQueue = {};

// memory cache, each loaded store is here and it's saved to filesystem at every changes,
// subsequent read hit the cache
let _store = {};
// main index
let _index;

const parse = content => {
  let obj = null;
  const date = new RegExp('^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\.[0-9]{1,3}Z$');

  obj = JSON.parse(content);
  // todo fix with forEach
  // go through every key/value to search for a date-like string
  _(obj).each(function(value, key) {
    if (_.isString(value) && value.match(date)) {
      obj[key] = moment(value);
    }
  });

  return obj;
};


const deleteFile = file => {
  return new Promise((resolve, reject) => {
    fs.unlink(file, err => {
      if (err) {
        reject(err)
      } else {
        resolve(true);
      }
    });
  });
};

const exists = (file) => {
  return new Promise(resolve => {
    fs.exists(file, exists => resolve(exists));
  });
};

const writeJson = (file, obj) => {

  const serialized = JSON.stringify(obj);
  return new Promise((resolve, reject) => {
    fs.writeFile(file, serialized, err => {
      if (err != null) {
        reject(err);
      } else {
        resolve(obj);
      }
    });
  });
};

const loadJson = file => {
  return new Promise((resolve, reject) => {
    fs.readFile(file, (err, content) => {

      if (err != null) {
        reject(err);
      } else {
        const index = parse(String(content));

        if (index != null) {
          resolve(index);
        } else {
          reject(new Error(`Unable to parse file ${file}`))
        }
      }
    });
  });
};


const loadOrCreateIndex = ({ path }) => {
  const indexPath = `${path}/index.json`;


  return exists(indexPath)
    .then(exists => {

      if (!exists) {
        let _index = { chatId: {}, userId: {} };
        return writeJson(indexPath, _index);
      } else {

        return loadJson(indexPath);
      }
    });

};

const saveIndex = ({ path }) => {
  const indexPath = `${path}/index.json`;
  return writeJson(indexPath, _index);
};


const getOrLoadOrCreateIndex = ({ path }) => {
  return new Promise(resolve => {
    if (_index != null) {
      resolve(_index);
    } else {
      loadOrCreateIndex({ path })
        .then(index => {
          _index = index;
          resolve(index);
        });
    }
  });
};

const loadFileStore = path => {
  // todo if present in cache return immediately

  const store = new FileStore(null, path);
  return store.load()
    .then(() => store);
};


/*const configExists = ({ userId, chatId, path }) => {
  return new Promise((resolve) => {
    if (!isEmpty(chatId)) {
      return resolve(fs.existsSync(`${path}/${chatId}.json`));
    } else if (!isEmpty(userId)) {
      return resolve(fs.existsSync(`${path}/user-${userId}.json`));
    }
    return resolve(false);
  });
};

const loadConfig = ({ userId, chatId, path, defaults }) => {
  //return new Promise((resolve) => {

  let storePath;
  if (!isEmpty(chatId)) {
    storePath = `${path}/${chatId}.json`;
  } else if (!isEmpty(userId)) {
    storePath = `${path}/user-${userId}.json`;
  }

  const store = new FileStore(null, storePath);
  return store.load()
    .then(() => store.set(defaults))
    .then(() => store);

  //});
};*/

function FileFactory(params) {

  params = params || {};
  if (_.isEmpty(params.path)) {
    throw 'Plain file context provider: missing parameter "path"';
  }
  if (!fs.existsSync(params.path)) {
    throw 'Plain file context provider: "path" (' + params.path + ') doesn\'t exist';
  }
  const { path } = params;


  this.getOrCreate = function(chatId, userId = null, defaults) {
    const { path } = params;

    return new Promise((resolve, reject) => {

      // get the index from the memory cache or from file, if doesn't exist create it
      getOrLoadOrCreateIndex({ path })
        .then(index => {

          // todo move this to the .get()
          if (chatId != null && index.chatId[chatId] != null) {
            return loadFileStore(`${path}/${index.chatId[chatId]}`)
              .then(store => {
                _store[index.chatId[chatId]] = store;
                resolve(store);
              });
          } else if (userId != null && index.userId[userId] != null) {
            return loadFileStore(`${path}/${index.userId[userId]}`)
              .then(store => {
                _store[index.userId[userId]] = store;
                resolve(store);
              });
          } else {
            // file store doesn't exist yet, create one
            const fileName = `store${chatId != null ? `-c${chatId}` : ''}${userId != null ? `-u${userId}` : ''}.json`;

            const store = new FileStore(null, `${path}/${fileName}`);
            // store in the index the file reference
            if (chatId != null) {
              index.chatId[chatId] = fileName;
            }
            if (userId != null) {
              index.userId[userId] = fileName;
            }
            _store[fileName] = store;

            return saveIndex({ path })
              .then(() => store.set({ ...defaults, chatId}))
              .then(store => {
                resolve(store);
              });
          }
        });


    }); // end promise
  };

  this.get = function(chatId, userId) {
    if (chatId != null && _index.chatId[chatId] != null) {
      return _store[_index.chatId[chatId]];
    } else if (userId != null && _index.userId[userId] != null) {
      return _store[_index.userId[userId]];
    }
    return null;
  };

  return this;
}

_.extend(FileFactory.prototype, {
  name: 'Plain File',
  description: 'Simple file context provider: chat context will be stored in plain json files. Specify the storage path in'
    + ' params as JSON config like this <pre style="margin-top: 10px;">\n'
    + '{\n'
    + '"path": "/my-path/my-context-files"\n'
    +'}</pre>',
  get: function(/*chatId*/) {
  },
  getOrCreate: function(/*chatId, defaults*/) {
  },
  start() {
    return new Promise(function(resolve) {
      resolve();
    });
  },
  reset({ path }) {
    const files = fs.readdirSync(path);
    files.forEach(file => fs.unlinkSync(`${path}/${file}`));
    _store = {};
    _index = null;
  },
  stop: function() {
    return new Promise(function(resolve) {
      resolve();
    });
  }
});

function FileStore(defaults, file) {
  this._context = _.clone(defaults || {});
  this._file = file;
  return this;
}
_.extend(FileStore.prototype, {
  get: function(key) {
    var _this = this;
    var keys = Array.prototype.slice.call(arguments, 0);
    return new Promise(function(resolve, reject) {
      _this.load()
        .then(
          function() {
            if (keys.length === 1) {
              return resolve(_this._context[key]);
            }
            var result = {};
            _(keys).each(function (key) {
              result[key] = _this._context[key];
            });
            resolve(result);
          },
          reject
        );
    });
  },

  parse: function(content) {
    var _this = this;
    var obj = null;
    var date = new RegExp('^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\.[0-9]{1,3}Z$');
    try {
      obj = JSON.parse(content);
      // go through every key/value to search for a date-like string
      _(obj).each(function(value, key) {
        if (_.isString(value) && value.match(date)) {
          obj[key] = moment(value);
        }
      });
    } catch(e) {
      lcd.error('Error parsing context file: ' + _this.file);
      throw e;
    }
    return obj;
  },

  load: function() {
    var _this = this;
    //var date = new RegExp('^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\.[0-9]{1,3}Z$');
    return new Promise(function(resolve, reject) {
      fs.readFile(_this._file, function(err, content) {
        if (err != null) {
          reject(err);
        } else {
          _this._context = _this.parse(content);
          resolve();
        }
      });
    });
  },
  save: function() {
    var _this = this;
    // store the value, before the task is executed or can be overwritten, it's a snapshot
    var serialized = JSON.stringify(_.clone(_this._context));
    var saveTask = function(resolve, reject) {
      fs.writeFile(_this._file, serialized, function(err) {
        // put the object back, don't know what happens here but some key disapper
        _this._context = _this.parse(serialized);
        if (err != null) {
          reject(err);
        } else {
          resolve();
        }
      });
    };

    if (filesQueue[_this._file] == null) {
      filesQueue[_this._file] = new FileQueue();
    }
    // add to a queue to prevent concurrent writing
    return filesQueue[_this._file].add(saveTask);
  },
  remove: function() {
    var _this = this;
    var keys = _.clone(arguments);
    // eslint-disable-next-line no-undefined
    return new Promise(function(resolve, reject) {
      _this.load()
        .then(function() {
          _(keys).each(function(key) {
            delete _this._context[key];
          });
          return _this.save();
        })
        .then(resolve, reject);
    });
  },
  set(key, value) {
    if (_.isString(key)) {
      this._context[key] = value;
    } else if (_.isObject(key)) {
      _(key).each((value, key) => this._context[key] = value);
    }
    return this.save().then(() => this);
  },
  dump: function() {
    // eslint-disable-next-line no-console
    console.log(this._context);
  },
  all: function() {
    return this._context;
  },
  clear: function() {
    this._context = {};
    return this.save();
  }
});

module.exports = FileFactory;

