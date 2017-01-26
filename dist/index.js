'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _store = require('store');

var storage = _interopRequireWildcard(_store);

var _intercom = require('./intercom.js/intercom.js');

var _intercom2 = _interopRequireDefault(_intercom);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var intercom = _intercom2.default.getInstance();

var compare = function compare(a, b) {

  var result = {
    different: [],
    missing_from_first: [],
    missing_from_second: []
  };

  _lodash2.default.reduce(a, function (result, value, key) {
    if (!a[key]) return result;
    if (!b) {
      result.missing_from_second.push(key);
      return result;
    }
    if (b[key]) {
      if (_lodash2.default.isEqual(value, b[key])) {
        return result;
      } else {
        if (_typeof(a[key]) != _typeof({}) || _typeof(b[key]) != _typeof({})) {
          //dead end.
          result.different.push(key);
          return result;
        } else {
          var deeper = compare(a[key], b[key]);
          result.different = result.different.concat(_lodash2.default.map(deeper.different, function (sub_path) {
            return key + "." + sub_path;
          }));

          result.missing_from_second = result.missing_from_second.concat(_lodash2.default.map(deeper.missing_from_second, function (sub_path) {
            return key + "." + sub_path;
          }));

          result.missing_from_first = result.missing_from_first.concat(_lodash2.default.map(deeper.missing_from_first, function (sub_path) {
            return key + "." + sub_path;
          }));
          return result;
        }
      }
    } else {
      result.missing_from_second.push(key);
      return result;
    }
  }, result);

  _lodash2.default.reduce(b, function (result, value, key) {
    if (!b[key]) return result;
    if (!a) {
      result.missing_from_first.push(key);
      return result;
    }
    if (a[key]) {
      return result;
    } else {
      result.missing_from_first.push(key);
      return result;
    }
  }, result);

  return result;
};

var util = {};

util.guid = function () {
  var S4 = function S4() {
    return ((1 + Math.random()) * 0x10000 | 0).toString(16).substring(1);
  };
  return function () {
    return S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4();
  };
}();

var Basement = function Basement(paths) {
  var _this = this;

  this._attached = false;

  this.attach_to_store = function (store) {
    store.replaceState(_lodash2.default.mergeWith(_lodash2.default.cloneDeep(store.state), storage.get('vuex-basement state'), function (o, s) {
      if (s == undefined) return null;else return undefined;
    }));

    _this.persist = function () {
      storage.transact('vuex-basement state', function (entry) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = paths.includes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var path = _step.value;

            _lodash2.default.set(entry, path.path, _lodash2.default.get(store.state, path.path));
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      });
    };

    _this.persist();

    intercom.on('vuex-basement: ping', function (commit_id) {
      intercom.emit('vuex-basement: pong', commit_id);
    });

    intercom.on('vuex-basement: global commit', function (_ref) {
      var commit = _ref.commit,
          snapshot = _ref.snapshot;

      store.commit(commit.mutation.type, commit.mutation.payload);

      setTimeout(function () {
        intercom.emit('vuex-basement: global commit reply', commit.id);
      }, 100);

      var new_state = storage.get('vuex-basement state');
      var c = compare(snapshot, new_state);

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = paths.includes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var path = _step2.value;


          //detect changes
          //--------------

          //on set
          if (_lodash2.default.includes(c.missing_from_first, path.path)) {
            if (path.reactions) {
              if (path.reactions.on_set) {
                var _iteratorNormalCompletion3 = true;
                var _didIteratorError3 = false;
                var _iteratorError3 = undefined;

                try {
                  for (var _iterator3 = path.reactions.on_set[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var reaction = _step3.value;

                    reaction(store, _lodash2.default.get(new_state, path.path), _lodash2.default.get(snapshot, path.path));
                  }
                } catch (err) {
                  _didIteratorError3 = true;
                  _iteratorError3 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                      _iterator3.return();
                    }
                  } finally {
                    if (_didIteratorError3) {
                      throw _iteratorError3;
                    }
                  }
                }
              }
            }
          }

          //on change
          if (_lodash2.default.includes(c.different, path.path)) {
            if (path.reactions) {
              if (path.reactions.on_change) {
                var _iteratorNormalCompletion4 = true;
                var _didIteratorError4 = false;
                var _iteratorError4 = undefined;

                try {
                  for (var _iterator4 = path.reactions.on_change[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var _reaction = _step4.value;

                    _reaction(store, _lodash2.default.get(new_state, path.path), _lodash2.default.get(snapshot, path.path));
                  }
                } catch (err) {
                  _didIteratorError4 = true;
                  _iteratorError4 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                      _iterator4.return();
                    }
                  } finally {
                    if (_didIteratorError4) {
                      throw _iteratorError4;
                    }
                  }
                }
              }
            }
          }

          //on unset
          if (_lodash2.default.includes(c.missing_from_second, path.path)) {
            if (path.reactions) {
              if (path.reactions.on_unset) {
                var _iteratorNormalCompletion5 = true;
                var _didIteratorError5 = false;
                var _iteratorError5 = undefined;

                try {
                  for (var _iterator5 = path.reactions.on_unset[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var _reaction2 = _step5.value;

                    _reaction2(store, _lodash2.default.get(new_state, path.path), _lodash2.default.get(snapshot, path.path));
                  }
                } catch (err) {
                  _didIteratorError5 = true;
                  _iteratorError5 = err;
                } finally {
                  try {
                    if (!_iteratorNormalCompletion5 && _iterator5.return) {
                      _iterator5.return();
                    }
                  } finally {
                    if (_didIteratorError5) {
                      throw _iteratorError5;
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    });

    _this._attached = true;
  };

  this.global_commit = function (context, mutation) {

    if (!_this._attached) {
      console.log('vuex-basement: No store attached to perform global commit');
      return;
    }

    //take snapshot.
    var snapshot = storage.get('vuex-basement state');
    context.commit(mutation.type, mutation.payload);
    _this.persist();

    return new Promise(function (resolve, reject) {
      var commit = {};
      commit.recipients = {};
      commit.recipients.count = 0;
      commit.recipients.done = {};
      commit.recipients.done.count = 0;

      commit.id = util.guid();
      commit.mutation = mutation;

      intercom.on('vuex-basement: pong', function (commit_id) {
        if (commit_id != commit.id) return;
        commit.recipients.count++;
      });

      intercom.emit('vuex-basement: ping', commit.id);

      intercom.on('vuex-basement: global commit reply', function (commit_id) {
        if (commit_id != commit.id) return;

        commit.recipients.done.count++;

        if (commit.recipients.done.count < commit.recipients.count) return;else {
          intercom.handlers['vuex-basement: pong'].pop();
          resolve();
        }
      });

      intercom.emit('vuex-basement: global commit', { commit: commit, snapshot: snapshot });
    });
  };

  return this;
};

module.exports = Basement;