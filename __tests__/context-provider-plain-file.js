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
  const path = __dirname + '/test-files';
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
        // assert.isTrue(fs.existsSync(`${path}/store-7369f3c86bf3c0a354615432832d9e8f.json`));
      });
  });

  it('should set some value and then get and remove it', async () => {
    const chatContext = await provider.getOrCreate(42, null, {});
    await chatContext.set('firstName', 'Guidone');
    let firstName =await chatContext.get('firstName');
    assert.equal(firstName, 'Guidone');
    await chatContext.remove('firstName');
    firstName = await chatContext.get('firstName');
    assert.isUndefined(firstName);
  });


  it('should set some values and then get and remove it', async () => {
    const chatContext = await provider.getOrCreate(42, null, {});
    await chatContext.set({firstName: 'Guido', lastName: 'Bellomo'});
    let firstName = await chatContext.get('firstName');
    assert.equal(firstName, 'Guido');
    let lastName = await chatContext.get('lastName');
    assert.equal(lastName, 'Bellomo');
    let json = await chatContext.get('firstName', 'lastName');
    assert.isObject(json);
    assert.equal(json.firstName, 'Guido');
    assert.equal(json.lastName, 'Bellomo');
  });

  it('should set some values and then get and remove it with userId', async () => {
    const chatContext = await provider.getOrCreate(null, 43, {});
    await chatContext.set({ firstName: 'Guido', lastName: 'Bellomo' });
    let firstName = await chatContext.get('firstName');
    assert.equal(firstName, 'Guido');
    let lastName = await chatContext.get('lastName');
    assert.equal(lastName, 'Bellomo');
    let json = await chatContext.get('firstName', 'lastName');
    assert.isObject(json);
    assert.equal(json.firstName, 'Guido');
    assert.equal(json.lastName, 'Bellomo');
  });

  it('should set some values and get the dump with chatId', async () => {
    const chatContext = await provider.getOrCreate(42, null, {});
    await chatContext.set({firstName: 'Guido', lastName: 'Bellomo', email: 'spam@gmail.com'});
    const json = await chatContext.all();
    assert.isObject(json);
    assert.equal(json.firstName, 'Guido');
    assert.equal(json.lastName, 'Bellomo');
    assert.equal(json.email, 'spam@gmail.com');
  });

  it('should set some values and get the dump with userId', async () => {
    const chatContext = await provider.getOrCreate(null, 43, {});
    await chatContext.set({firstName: 'Guido', lastName: 'Bellomo', email: 'spam@gmail.com'});
    const json = await chatContext.all();
    assert.isObject(json);
    assert.equal(json.firstName, 'Guido');
    assert.equal(json.lastName, 'Bellomo');
    assert.equal(json.email, 'spam@gmail.com');
  });

  it('should set some values and remove all for chatId', async () => {
    const chatContext = await provider.getOrCreate(42, {});
    await chatContext.set({firstName: 'Guido', lastName: 'Bellomo'});
    await chatContext.clear();
    let firstName = await chatContext.get('firstName');
    assert.isUndefined(firstName);
    let lastName = await chatContext.get('lastName');
    assert.isUndefined(lastName);
    const json = await chatContext.all();
    assert.isObject(json);
    assert.isTrue(_.isEmpty(json));
  });

  it('should set some values and remove all for userId', async () => {
    const chatContext = await provider.getOrCreate(null, 43,  {});
    await chatContext.set({firstName: 'Guido', lastName: 'Bellomo'});
    await chatContext.clear();
    const firstName = await chatContext.get('firstName');
    assert.isUndefined(firstName)
    const lastName = await chatContext.get('lastName');
    assert.isUndefined(lastName)
    const json = await chatContext.all();
    assert.isObject(json);
    assert.isTrue(_.isEmpty(json));
  });

  it('should set some value the remove with multiple arguments for chatId', async () => {
    const chatContext = await provider.getOrCreate(42, {});
    await chatContext.set({firstName: 'Guidone', lastName: 'Bellomo', email: 'some@email'})
    const firstName = await chatContext.get('firstName');
    assert.equal(firstName, 'Guidone');
    await chatContext.remove('firstName', 'lastName', 'email');
    const json = await chatContext.all();
    assert.isUndefined(json.firstName);
    assert.isUndefined(json.lastName);
    assert.isUndefined(json.email);
  });

  it('should set some value the remove with multiple arguments for userId', async () => {
    const chatContext = await provider.getOrCreate(null, 43, {});
    await chatContext.set({firstName: 'Guidone', lastName: 'Bellomo', email: 'some@email'});
    const firstName = await chatContext.get('firstName');
    assert.equal(firstName, 'Guidone');
    await chatContext.remove('firstName', 'lastName', 'email');
    const json = await chatContext.all();
    assert.isUndefined(json.firstName);
    assert.isUndefined(json.lastName);
    assert.isUndefined(json.email);
  });

  it    ('should set some value with chatId and userId', async () => {
    const chatContext = await provider.getOrCreate(42, 44, { userId: 44, chatId: 42 });
    await chatContext.set('firstName', 'Guidone');
    let firstName = await chatContext.get('firstName');
    assert.equal(firstName, 'Guidone');
    let userId = await chatContext.get('userId');
    assert.equal(userId, 44);
    let chatId = await chatContext.get('chatId');
    assert.equal(chatId, 42);
    const chatContext2 = await provider.getOrCreate(null, 44, { userId: 44, chatId: 42 });
    firstName = await chatContext2.get('firstName');
    assert.equal(firstName, 'Guidone');
    userId = await chatContext2.get('userId');
    assert.equal(userId, 44);
    chatId = await chatContext2.get('chatId');
    assert.equal(chatId, 42);
    await chatContext2.remove('firstName');
    firstName = await chatContext2.get('firstName');
    assert.isUndefined(firstName);
  });

});
