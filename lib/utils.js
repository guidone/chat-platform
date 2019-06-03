module.exports = {

  /**
   * @method when
   * If an object is thenable, then return the object itself, otherwise wrap it into a promise
   * @param {any}
   * @deferred
   */
  when: function (param) {
    if (param != null && _.isFunction(param.then)) {
      return param;
      // eslint-disable-next-line no-undefined
    } else if (param !== undefined) {
      return new Promise(function (resolve) {
        resolve(param);
      });
    }
    return new Promise(function (resolve, reject) {
      reject();
    });
  }

};
