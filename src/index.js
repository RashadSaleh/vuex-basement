import * as storage from 'store';
import Intercom from './intercom.js/intercom.js';
import _ from 'lodash';

var intercom = Intercom.getInstance();


var compare = function (a, b) {

  var result = {
    different: [],
    missing_from_first: [],
    missing_from_second: []
  };

  _.reduce(a, function (result, value, key) {
    if (!a[key]) return result;
    if (!b) {
      result.missing_from_second.push(key);
      return result;
    }
    if (b[key]) {
      if (_.isEqual(value, b[key])) {
        return result;
      } else {
        if (typeof (a[key]) != typeof ({}) || typeof (b[key]) != typeof ({})) {
          //dead end.
          result.different.push(key);
          return result;
        } else {
          var deeper = compare(a[key], b[key]);
          result.different = result.different.concat(_.map(deeper.different, (sub_path) => {
            return key + "." + sub_path;
          }));

          result.missing_from_second = result.missing_from_second.concat(_.map(deeper.missing_from_second, (sub_path) => {
            return key + "." + sub_path;
          }));

          result.missing_from_first = result.missing_from_first.concat(_.map(deeper.missing_from_first, (sub_path) => {
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

  _.reduce(b, function (result, value, key) {
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
}

var util = {};

util.guid = (function () {
  var S4 = function () {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  };
  return function () {
    return S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4();
  };
})();


var Basement = function (paths) {

  this._attached = false;

  this.attach_to_store = (store) => {
    store.replaceState(_.mergeWith(_.cloneDeep(store.state), storage.get('vuex-basement state'), function (o, s) {
      if (s == undefined) return null;
      else return undefined;
    }));

    this.persist = function () {
      storage.transact('vuex-basement state', (entry) => {
        for (let path of paths.includes) {
          _.set(entry, path.path, _.get(store.state, path.path));
        }
      });
    }

    this.persist();

    intercom.on('vuex-basement: ping', function (commit_id) {
      intercom.emit('vuex-basement: pong', commit_id);
    })

    intercom.on('vuex-basement: global commit', function ({commit, snapshot}) {
      store.commit(commit.mutation.type, commit.mutation.payload);

      setTimeout(()=> {
        intercom.emit('vuex-basement: global commit reply', commit.id);
      }, 100);

      let new_state = storage.get('vuex-basement state');
      let c = compare(snapshot, new_state);

      for (let path of paths.includes) {

        //detect changes
        //--------------

        //on set
        if (_.includes(c.missing_from_first, path.path)) {
          if (path.reactions) {
            if (path.reactions.on_set) {
              for (let reaction of path.reactions.on_set) {
                reaction(store, _.get(new_state, path.path), _.get(snapshot, path.path));
              }
            }
          }
        }

        //on change
        if (_.includes(c.different, path.path)) {
          if (path.reactions) {
            if (path.reactions.on_change) {
              for (let reaction of path.reactions.on_change) {
                reaction(store, _.get(new_state, path.path), _.get(snapshot, path.path));
              }
            }
          }
        }

        //on unset
        if (_.includes(c.missing_from_second, path.path)) {
          if (path.reactions) {
            if (path.reactions.on_unset) {
              for (let reaction of path.reactions.on_unset) {
                reaction(store, _.get(new_state, path.path), _.get(snapshot, path.path));
              }
            }
          }
        }
      }
    });

    this._attached = true;
  }

  this.global_commit = (context, mutation) => {

    if (!this._attached) {
      console.log('vuex-basement: No store attached to perform global commit');
      return;
    }

    //take snapshot.
    let snapshot = storage.get('vuex-basement state');
    context.commit(mutation.type, mutation.payload);
    this.persist();

    return new Promise((resolve, reject) => {
      let commit = {};
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

      intercom.on('vuex-basement: global commit reply', (commit_id) => {
        if (commit_id != commit.id) return;

        commit.recipients.done.count++;

        if (commit.recipients.done.count < commit.recipients.count) return;
        else {
          intercom.handlers['vuex-basement: pong'].pop();
          resolve();
        }
      });

      intercom.emit('vuex-basement: global commit', { commit, snapshot });
    });
  }

  return this;
}

module.exports = Basement;