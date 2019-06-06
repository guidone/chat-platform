const _ = require('underscore');
const assert = require('chai').assert;
const RED = require('../lib/red-stub')();
const ContextProviders = require('../chat-context-factory');
const os = require('os');
const fs = require('fs');
const { when } = require('../lib/utils');


describe('Chat context provider file', () => {

  const contextProviders = ContextProviders(RED);
  //const path = os.tmpdir();
  const path = '/web/test-files';
  const provider = contextProviders.getProvider('plain-file', { path });

  beforeEach(() => {
    return provider.reset({ path });
  });

  it('should create a context provider with some default params', () => {

    assert.isTrue(contextProviders.hasProvider('plain-file'));
    const provider = contextProviders.getProvider('plain-file', { path });
    assert.isFunction(provider.getOrCreate);
    assert.isFunction(provider.get);

    return when(provider.getOrCreate(42, null, { myVariable: 'initial value'}))
      .then(chatContext => {
        assert.isFunction(chatContext.get);
        assert.isFunction(chatContext.set);
        assert.isFunction(chatContext.all);
        assert.isFunction(chatContext.remove);
        assert.isFunction(chatContext.clear);

        return chatContext.get('myVariable');
      }).then(myVariable => {
        assert.equal(myVariable, 'initial value');
        assert.isTrue(fs.existsSync(`${path}/store-c42.json`));
      });
  });

  it('should set some value and then get and remove it', () => {

    return when(provider.getOrCreate(42, null, {}))
      .then(chatContext => chatContext.set('firstName', 'Guidone'))
      .then(() =>when(provider.get(42).get('firstName')))
      .then(firstName => assert.equal(firstName, 'Guidone'))
      .then(() => when(provider.get(42).remove('firstName')))
      .then(() => when(provider.get(42).get('firstName')))
      .then(firstName => assert.isUndefined(firstName));
  });


  it('should set some values and then get and remove it', () => {

    return when(provider.getOrCreate(42, null, {}))
      .then(chatContext => chatContext.set({firstName: 'Guido', lastName: 'Bellomo'}))
      .then(() => when(provider.get(42, null).get('firstName')))
      .then(firstName => assert.equal(firstName, 'Guido'))
      .then(() => when(provider.get(42, null).get('lastName')))
      .then(lastName => assert.equal(lastName, 'Bellomo'))
      .then(() => when(provider.get(42, null).get('firstName', 'lastName')))
      .then(json => {
        assert.isObject(json);
        assert.equal(json.firstName, 'Guido');
        assert.equal(json.lastName, 'Bellomo');
      });
  });

  it('should set some values and then get and remove it with userId', () => {

    return when(provider.getOrCreate(null, 43, {}))
      .then(chatContext => chatContext.set({firstName: 'Guido', lastName: 'Bellomo'}))
      .then(() => when(provider.get(null, 43).get('firstName')))
      .then(firstName => assert.equal(firstName, 'Guido'))
      .then(() => when(provider.get(null, 43).get('lastName')))
      .then(lastName => assert.equal(lastName, 'Bellomo'))
      .then(() => when(provider.get(null, 43).get('firstName', 'lastName')))
      .then(json => {
        assert.isObject(json);
        assert.equal(json.firstName, 'Guido');
        assert.equal(json.lastName, 'Bellomo');
      });
  });

  it('should set some values and get the dump with chatId', () => {

    return when(provider.getOrCreate(42, null, {}))
      .then(chatContext => chatContext.set({firstName: 'Guido', lastName: 'Bellomo', email: 'spam@gmail.com'}))
      .then(() => when(provider.get(42).all()))
      .then(json => {
        assert.isObject(json);
        assert.equal(json.firstName, 'Guido');
        assert.equal(json.lastName, 'Bellomo');
        assert.equal(json.email, 'spam@gmail.com');
      });
  });

  it('should set some values and get the dump with userId', () => {
    return when(provider.getOrCreate(null, 43, {}))
      .then(chatContext => chatContext.set({firstName: 'Guido', lastName: 'Bellomo', email: 'spam@gmail.com'}))
      .then(() => when(provider.get(null, 43).all()))
      .then(json => {
        assert.isObject(json);
        assert.equal(json.firstName, 'Guido');
        assert.equal(json.lastName, 'Bellomo');
        assert.equal(json.email, 'spam@gmail.com');
      });
  });

  it('should set some values and remove all for chatId', function() {
    return when(provider.getOrCreate(42, {}))
      .then(chatContext => chatContext.set({firstName: 'Guido', lastName: 'Bellomo'}))
      .then(() => when(provider.get(42).clear()))
      .then(() => when(provider.get(42).get('firstName')))
      .then(firstName => assert.isUndefined(firstName))
      .then(() => when(provider.get(42).get('lastName')))
      .then(lastName => assert.isUndefined(lastName))
      .then(() =>when(provider.get(42).all()))
      .then(json => {
        assert.isObject(json);
        assert.isTrue(_.isEmpty(json));
      });
  });

  it('should set some values and remove all for userId', () => {
    return when(provider.getOrCreate(null, 43,  {}))
      .then(chatContext => chatContext.set({firstName: 'Guido', lastName: 'Bellomo'}))
      .then(() => when(provider.get(null, 43).clear()))
      .then(() => when(provider.get(null, 43).get('firstName')))
      .then(firstName => assert.isUndefined(firstName))
      .then(() => when(provider.get(null, 43).get('lastName')))
      .then(lastName => assert.isUndefined(lastName))
      .then(() =>when(provider.get(null, 43).all()))
      .then(json => {
        assert.isObject(json);
        assert.isTrue(_.isEmpty(json));
      });
  });

  it('should set some value the remove with multiple arguments for chatId', () => {
    return when(provider.getOrCreate(42, {}))
      .then(chatContext => chatContext.set({firstName: 'Guidone', lastName: 'Bellomo', email: 'some@email'}))
      .then(() => when(provider.get(42).get('firstName')))
      .then(firstName => assert.equal(firstName, 'Guidone'))
      .then(() => when(provider.get(42).remove('firstName', 'lastName', 'email')))
      .then(() => when(provider.get(42).all()))
      .then(json => {
        assert.isUndefined(json.firstName);
        assert.isUndefined(json.lastName);
        assert.isUndefined(json.email);
      });
  });

  it('should set some value the remove with multiple arguments for userId', () => {
    return when(provider.getOrCreate(null, 43, {}))
      .then(chatContext => chatContext.set({firstName: 'Guidone', lastName: 'Bellomo', email: 'some@email'}))
      .then(() => when(provider.get(null, 43).get('firstName')))
      .then(firstName => assert.equal(firstName, 'Guidone'))
      .then(() => when(provider.get(null, 43).remove('firstName', 'lastName', 'email')))
      .then(() => when(provider.get(null, 43).all()))
      .then(json => {
        assert.isUndefined(json.firstName);
        assert.isUndefined(json.lastName);
        assert.isUndefined(json.email);
      });
  });


});
