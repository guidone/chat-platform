const _ = require('underscore');
const fs = require('fs');
const moment = require('moment');
const lcd = require('../helpers/lcd');
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

const loadFileStore = (path, file) => {
  if (_store[file] != null) {
    return Promise.resolve(_store[file]);
  }
  const store = new FileStore(null, `${path}/${file}`);
  return store.load()
    .then(() => store);
};



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
          // if chatid or userid have a context, then loadit
          if (chatId != null && index.chatId[chatId] != null) {
            return loadFileStore(path, index.chatId[chatId])
              .then(store => {
                _store[index.chatId[chatId]] = store;
                resolve(store);
              });
          } else if (userId != null && index.userId[userId] != null) {
            return loadFileStore(path, index.userId[userId])
              .then(store => {
                _store[index.userId[userId]] = store;
                resolve(store);
              });
          } else {
            // file store doesn't exist yet, create one
            const fileName = `store${chatId != null ? `-c${chatId}` : ''}${userId != null ? `-u${userId}` : ''}.json`;
            // store also userId if present
            const store = new FileStore({ [userId != null ? 'userId' : null]: userId }, `${path}/${fileName}`);
            // store in the index the file reference
            if (chatId != null) {
              index.chatId[chatId] = fileName;
            }
            if (userId != null) {
              index.userId[userId] = fileName;
            }
            _store[fileName] = store;
            // save index
            return saveIndex({ path })
              .then(() => store.set({ ...defaults, chatId})) // todo move this up?
              .then(store => resolve(store), reject);
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
  get(/*chatId*/) { },
  getOrCreate(/*chatId, defaults*/) { },
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
  get(key) {
    const keys = Array.prototype.slice.call(arguments, 0);
    return new Promise((resolve, reject) => {
      this.load()
        .then(() => {
            if (keys.length === 1) {
              return resolve(this._context[key]);
            }
            const result = {};
            _(keys).each(key => result[key] = this._context[key]);
            resolve(result);
          },
          reject
        );
    });
  },

  parse(content) {
    let obj = null;
    let date = new RegExp('^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}\.[0-9]{1,3}Z$');
    try {
      obj = JSON.parse(content);
      // go through every key/value to search for a date-like string
      _(obj).each((value, key) => {
        if (_.isString(value) && value.match(date)) {
          obj[key] = moment(value);
        }
      });
    } catch(e) {
      // eslint-disable-next-line no-console
      console.log(lcd.error('Error parsing context file: ' + this._file));
      throw e;
    }
    return obj;
  },

  load() {
    return new Promise((resolve, reject) => {
      fs.readFile(this._file, (err, content) => {
        if (err != null) {
          reject(err);
        } else {
          this._context = this.parse(content);
          resolve();
        }
      });
    });
  },
  save() {
    // store the value, before the task is executed or can be overwritten, it's a snapshot
    const serialized = JSON.stringify(_.clone(this._context));
    let saveTask = (resolve, reject) => {
      fs.writeFile(this._file, serialized, err => {
        // put the object back, don't know what happens here but some key disapper
        this._context = this.parse(serialized);
        if (err != null) {
          reject(err);
        } else {
          resolve();
        }
      });
    };

    if (filesQueue[this._file] == null) {
      filesQueue[this._file] = new FileQueue();
    }
    // add to a queue to prevent concurrent writing
    return filesQueue[this._file].add(saveTask);
  },
  remove() {
    const keys = _.clone(arguments);
    // eslint-disable-next-line no-undefined
    return new Promise((resolve, reject) => {
      this.load()
        .then(() => {
          _(keys).each(key => delete this._context[key]);
          return this.save();
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
  dump() {
    // eslint-disable-next-line no-console
    console.log(this._context);
  },
  all() {
    return this._context;
  },
  clear() {
    this._context = {};
    return this.save();
  }
});

module.exports = FileFactory;

