const _ = require('underscore');
const assert = require('chai').assert;
const fs = require('fs');
const RED = require('../lib/red-stub')();
const ContextProviders = require('../chat-context-factory');
const { when } = require('../lib/utils');

const copyFile = (source, destination) => new Promise((resolve, reject) => {
  fs.copyFile(source, destination, error => {
    if (error != null) {
      reject(error);
    } else {
      resolve();
    }
  });
});

const removeFile = file => new Promise((resolve, reject) => {
  fs.unlink(file, error => {
    if (error != null) {
      reject(error);
    } else {
      resolve();
    }
  });
});


describe('Chat context provider sqlite', () => {
  const contextProviders = ContextProviders(RED);
  const getProvider = () => contextProviders.getProvider('sqlite', { dbPath: __dirname + '/dummy/mission-control.sqlite' });

  beforeAll(async () => {
    await copyFile(__dirname + '/dummy/mission-control.backup', __dirname + '/dummy/mission-control.sqlite');
    const provider = getProvider();
    await provider.start();
  });

  afterAll(async () => {
    await removeFile(__dirname + '/dummy/mission-control.sqlite');
  });

  beforeEach(async () => {
    const provider = getProvider();
    await provider.reset();
  });

  it('should create a context provider with some default params with chatId', async () => {

    assert.isTrue(contextProviders.hasProvider('sqlite'));
    const provider = getProvider();
    assert.isFunction(provider.getOrCreate);
    assert.isFunction(provider.get);
    const chatContext = await provider.getOrCreate(43, null, { chatId: 43 });
    await chatContext.set({ myVariable: 'initial value' })
    assert.isFunction(chatContext.get);
    assert.isFunction(chatContext.set);
    assert.isFunction(chatContext.all);
    assert.isFunction(chatContext.remove);
    assert.isFunction(chatContext.clear);
    const myVariable = await  chatContext.get('myVariable');

    assert.equal(myVariable, 'initial value');
  });

  it('should create a context provider with some default params with userId', async () => {
    assert.isTrue(contextProviders.hasProvider('sqlite'));
    const provider = getProvider();
    assert.isFunction(provider.getOrCreate);
    assert.isFunction(provider.get);
    const chatContext = await provider.getOrCreate(null, 44, { userId: 44 });
    await chatContext.set({ myVariable: 'initial value' })
    assert.isFunction(chatContext.get);
    assert.isFunction(chatContext.set);
    assert.isFunction(chatContext.all);
    assert.isFunction(chatContext.remove);
    assert.isFunction(chatContext.clear);
    const myVariable = await chatContext.get('myVariable');
    assert.equal(myVariable, 'initial value');
  });


  it('should set some value and then get and remove it with chatId', async () => {
    const provider = getProvider();
    const chatContext = await provider.getOrCreate(42, null, { chatId: 42 });
    await chatContext.set('firstName', 'Guidone');
    let firstName = await chatContext.get('firstName');
    assert.equal(firstName, 'Guidone')
    await chatContext.remove('firstName')
    firstName = await chatContext.get('firstName')
    assert.isNull(firstName);
  });

  it('should set some value and then get and remove it with userId', async () => {
    const provider = getProvider();
    const chatContext = await provider.getOrCreate(null, 43, { userId: 43 });
    await chatContext.set('firstName', 'Guidone');
    let firstName = await chatContext.get('firstName');
    assert.equal(firstName, 'Guidone');
    await chatContext.remove('firstName')
    firstName = await chatContext.get('firstName');
    assert.isNull(firstName);
  });


  it('should set some values and then get and remove it with chatId', async () => {
    const provider = getProvider();
    const chatContext = await provider.getOrCreate(42, null, { chatId: 42 });
    await chatContext.set({ firstName: 'Guido', lastName: 'Bellomo' });
    let firstName = await chatContext.get('firstName');
    assert.equal(firstName, 'Guido');
    let lastName = await chatContext.get('lastName');
    assert.equal(lastName, 'Bellomo')
    const json = await chatContext.get('firstName', 'lastName');
    assert.isObject(json);
    assert.equal(json.firstName, 'Guido');
    assert.equal(json.lastName, 'Bellomo');
  });

  it('should set some values and then get and remove it with userId', async () => {
    const provider = getProvider();
    const chatContext = await provider.getOrCreate(null, 43, { userId: 43 });
    await chatContext.set({firstName: 'Guido', lastName: 'Bellomo'});
    const firstName = await chatContext.get('firstName');
    assert.equal(firstName, 'Guido');
    const lastName = await chatContext.get('lastName');
    assert.equal(lastName, 'Bellomo');
    const json = await chatContext.get('firstName', 'lastName');
    assert.isObject(json);
    assert.equal(json.firstName, 'Guido');
    assert.equal(json.lastName, 'Bellomo');
  });

  it('should set some values and get the dump with chatId', async () => {
    const provider = getProvider();
    const chatContext = await provider.getOrCreate(42, null, { chatId: 42 });
    await chatContext.set({ firstName: 'Guido', lastName: 'Bellomo', email: 'spam@gmail.com' });
    const json = await chatContext.all();
    assert.isObject(json);
    assert.equal(json.firstName, 'Guido');
    assert.equal(json.lastName, 'Bellomo');
    assert.equal(json.email, 'spam@gmail.com');
  });

  it('should set some values and get the dump with userId', async () => {
    const provider = getProvider();
    const chatContext = await provider.getOrCreate(null, 43, { userId: 43 });
    await chatContext.set({ firstName: 'Guido', lastName: 'Bellomo', email: 'spam@gmail.com' })
    const json = await chatContext.all();
    assert.isObject(json);
    assert.equal(json.firstName, 'Guido');
    assert.equal(json.lastName, 'Bellomo');
    assert.equal(json.email, 'spam@gmail.com');
  });

  it('should set some values and remove all with chatId', async () => {
    const provider = getProvider();
    const chatContext = await provider.getOrCreate(42, null, { userId: 42 });
    await chatContext.set({ firstName: 'Guido', lastName: 'Bellomo' });
    await chatContext.clear();
    const json = await chatContext.all();
    assert.isObject(json);
    assert.isTrue(_.isEmpty(json));
  });

  it('should set some values and remove all with userId', async () => {
    const provider = getProvider();
    const chatContext = await provider.getOrCreate(null, 43, { userId: 43 });
    await chatContext.set({ firstName: 'Guido', lastName: 'Bellomo' });
    await chatContext.clear();
    const json = await chatContext.all();
    assert.isObject(json);
    assert.isTrue(_.isEmpty(json));
  });

  it('should set some value the remove with multiple arguments', async () => {
    const provider = getProvider();
    const chatContext = await provider.getOrCreate(42, null, { chatId: 42 });
    await chatContext.set({ firstName: 'Guidone', lastName: 'Bellomo', email: 'some@email' });
    const firstName = await chatContext.get('firstName');
    assert.equal(firstName, 'Guidone');
    await chatContext.remove('firstName', 'lastName', 'email');
    const json = await chatContext.all();
    assert.isUndefined(json.firstName);
    assert.isUndefined(json.lastName);
    assert.isUndefined(json.email);
  });

  it('should set some value with chatId and userId', async () => {
    const provider = getProvider();
    let chatContext = await provider.getOrCreate(42, 44, { userId: 44, chatId: 42 });
    await chatContext.set('firstName', 'Guidone');
    let firstName = await chatContext.get('firstName');
    assert.equal(firstName, 'Guidone');
    chatContext = await provider.getOrCreate(null, 44, { userId: 44, chatId: 42 });
    assert.equal(await chatContext.get('userId'), 44);
    assert.equal(await chatContext.get('firstName'), 'Guidone');
    await chatContext.remove('firstName');
    firstName = await chatContext.get('firstName');
    assert.isNull(firstName);
  });

});
