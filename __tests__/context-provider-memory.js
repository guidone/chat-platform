const _ = require('underscore');
const assert = require('chai').assert;
const RED = require('../lib/red-stub')();
const ContextProviders = require('../chat-context-factory');
const { when } = require('../lib/utils');

describe('Chat context provider memory', () => {

  const contextProviders = ContextProviders(RED);

  beforeEach(() => {
    const provider = contextProviders.getProvider('memory');
    provider.reset();
  });

  it('should create a context provider with some default params with chatId', () => {

    assert.isTrue(contextProviders.hasProvider('memory'));
    const provider = contextProviders.getProvider('memory');
    assert.isFunction(provider.getOrCreate);
    assert.isFunction(provider.get);

    return when(provider.getOrCreate(43, null, { myVariable: 'initial value'}))
      .then(chatContext => {
        assert.isFunction(chatContext.get);
        assert.isFunction(chatContext.set);
        assert.isFunction(chatContext.all);
        assert.isFunction(chatContext.remove);
        assert.isFunction(chatContext.clear);
        return chatContext.get('myVariable');
      }).then(myVariable => {
        assert.equal(myVariable, 'initial value');
      });
  });

  it('should create a context provider with some default params with userId', () => {

    assert.isTrue(contextProviders.hasProvider('memory'));
    const provider = contextProviders.getProvider('memory');
    assert.isFunction(provider.getOrCreate);
    assert.isFunction(provider.get);

    return when(provider.getOrCreate(null, 44, { myVariable: 'initial value'}))
      .then(chatContext => {
        assert.isFunction(chatContext.get);
        assert.isFunction(chatContext.set);
        assert.isFunction(chatContext.all);
        assert.isFunction(chatContext.remove);
        assert.isFunction(chatContext.clear);
        return chatContext.get('myVariable');
      }).then(myVariable => {
        assert.equal(myVariable, 'initial value');
      });
  });


  it('should set some value and then get and remove it with chatId', () => {

    const provider = contextProviders.getProvider('memory');

    return when(provider.getOrCreate(42, null, {}))
      .then(chatContext => chatContext.set('firstName', 'Guidone'))
      .then(() => when(provider.get(42).get('firstName')))
      .then(firstName => assert.equal(firstName, 'Guidone'))
      .then(() => when(provider.get(42).remove('firstName')))
      .then(() => when(provider.get(42).get('firstName')))
      .then(
        () => {},
        firstName => {
          assert.isUndefined(firstName);
        });
  });

  it('should set some value and then get and remove it with userId', () => {

    const provider = contextProviders.getProvider('memory');

    return when(provider.getOrCreate(null, 43, {}))
      .then(chatContext => chatContext.set('firstName', 'Guidone'))
      .then(() => when(provider.get(null, 43).get('firstName')))
      .then(firstName => assert.equal(firstName, 'Guidone'))
      .then(() => when(provider.get(null, 43).remove('firstName')))
      .then(() => when(provider.get(null, 43).get('firstName')))
      .then(
        () => {},
        firstName => {
          assert.isUndefined(firstName);
        });
  });

  it('should set some values and then get and remove it with chatId', () => {

    const provider = contextProviders.getProvider('memory');

    return when(provider.getOrCreate(42, null, {}))
      .then(chatContext => chatContext.set({firstName: 'Guido', lastName: 'Bellomo'}))
      .then(() => when(provider.get(42).get('firstName')))
      .then(firstName => assert.equal(firstName, 'Guido'))
      .then(() =>when(provider.get(42).get('lastName')))
      .then(lastName => assert.equal(lastName, 'Bellomo'))
      .then(() => when(provider.get(42).get('firstName', 'lastName')))
      .then(json => {
        assert.isObject(json);
        assert.equal(json.firstName, 'Guido');
        assert.equal(json.lastName, 'Bellomo');
      });
  });

  it('should set some values and then get and remove it with userId', () => {

    const provider = contextProviders.getProvider('memory');

    return when(provider.getOrCreate(null, 43, {}))
      .then(chatContext => chatContext.set({firstName: 'Guido', lastName: 'Bellomo'}))
      .then(() => when(provider.get(null, 43).get('firstName')))
      .then(firstName => assert.equal(firstName, 'Guido'))
      .then(() =>when(provider.get(null, 43).get('lastName')))
      .then(lastName => assert.equal(lastName, 'Bellomo'))
      .then(() => when(provider.get(null, 43).get('firstName', 'lastName')))
      .then(json => {
        assert.isObject(json);
        assert.equal(json.firstName, 'Guido');
        assert.equal(json.lastName, 'Bellomo');
      });
  });

  it('should set some values and get the dump with chatId', () => {

    const provider = contextProviders.getProvider('memory');

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

    const provider = contextProviders.getProvider('memory');

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

  it('should set some values and remove all with chatId', () => {

    const provider = contextProviders.getProvider('memory');

    return when(provider.getOrCreate(42, null, {}))
      .then(chatContext => chatContext.set({firstName: 'Guido', lastName: 'Bellomo'}))
      .then(() => when(provider.get(42).clear()))
      .then(() => when(provider.get(42).all()))
      .then(json => {
        assert.isObject(json);
        assert.isTrue(_.isEmpty(json));
      });
  });

  it('should set some values and remove all with userId', () => {

    const provider = contextProviders.getProvider('memory');

    return when(provider.getOrCreate(null, 43, {}))
      .then(chatContext => chatContext.set({firstName: 'Guido', lastName: 'Bellomo'}))
      .then(() => when(provider.get(null, 43).clear()))
      .then(() => when(provider.get(null, 43).all()))
      .then(json => {
        assert.isObject(json);
        assert.isTrue(_.isEmpty(json));
      });
  });

  it('should set some value the remove with multiple arguments', () => {

    const provider = contextProviders.getProvider('memory');

    return when(provider.getOrCreate(42, null, {}))
      .then(chatContext =>chatContext.set({firstName: 'Guidone', lastName: 'Bellomo', email: 'some@email'}))
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

  it('should set some value with chatId and userId', () => {

    const provider = contextProviders.getProvider('memory');

    return when(provider.getOrCreate(42, 44, {}))
      .then(chatContext => chatContext.set('firstName', 'Guidone'))
      .then(() => when(provider.get(42, null).get('firstName')))
      .then(firstName => assert.equal(firstName, 'Guidone'))
      .then(() => when(provider.get(null, 44)))

      .then(chatContext => {
        console.log('firstName', chatContext);
        assert.equal(chatContext.get('firstName'), 'Guidone');
        assert.equal(chatContext.get('userId'), 44);
      })
      .then(() => when(provider.get(42, null).remove('firstName')))
      .then(() => when(provider.get(42, null).get('firstName')))
      .then(
        () => {},
        firstName => {
          assert.isUndefined(firstName);
        });
  });

});
