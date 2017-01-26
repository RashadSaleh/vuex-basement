# vuex-basement
Vuex state persistance and synchronization between tabs/windows.

<<<<<<< HEAD
~~### One Shortcomming (please read before use).
This library has been tested to work as intended on latest versions of Chrome, Firefox and Edge. However, in Chrome, there is a noticable delay between issuing a `global commit` to change the state in *all* open tabs/windows, and for the actual changes to take effect. This might be degrading to the user experience you want to achieve, and you are welcome to try this for your application and judge for yourself. This "bug" has survived multiple code rewrites and is not obvious to determine its cause from studying the code alone, which might or might not mean that it is a *Chrome* bug. Any help will with [the issue](https://github.com/RashadSaleh/vuex-basement/issues/1) will be greatly appreciated.~~

SOLVED! Turns out the problem was caused by browsers (especially chrome) throttling javascript execution in out-of-focus tabs. You don't need to worry about this anymore, except for a little caveat that is explained below.

### Concept

vuex-basement allows you to define a "basement" for your vue app that is shared between all open tabs/windows. The basement is simply a part (or all) of your vuex state that, optionally, can be made persisting, as well as being shared, accessable and reactive from any tab/window. This is accomplished through defining the paths of your state that form the persistant "basement" state, as well as adding the powerful `global commit` action to your vuex store, which allows you to issue a commit from any tab to *all* open tabs/windows, effectively synchronizing the app state across those tabs/windows.
=======
### One Shortcomming (please read before use).
This library has been tested to work as intended on latest versions of Chrome, Firefox and Edge. However, in Chrome, there is a noticable delay between issuing a `global commit` to change the state in *all* open tabs/windows, and for the actual changes to take effect. This might be degrading to the user experience you want to achieve, and you are welcome to try this for your application and judge for yourself. This "bug" has survived multiple code rewrites and is not obvious to determine its cause from studying the code alone, which might or might not mean that it is a *Chrome* bug. Any help will with [the issue](https://github.com/RashadSaleh/vuex-basement/issues/1) will be greatly appreciated.
>>>>>>> origin/master

### Installation

``` bash
npm install vuex-basement
```


### Usage

import the library:
```js
import Basement from 'vuex-basement';
```
create your basement instance, providing paths you want to persist (uses localStorage under the hood), and optional reactions to be triggered on path value changes:

(please read till the end to understand how persistance works)
```js
var basement = new Basement({
  includes: // Array of state paths that you want to persist.
            // Here we do only one path object.
    [{
        path: 'user.login.access_token', // The path itself
        reactions: { 
        // Reactions to be triggered upon changes in the path's
        // value (optional). Multiple reactions (or functions)
        // can be triggered for any one change...
        // ... (thus the array [...] syntax.)
          on_set: [function (store, new_value) {
            store.dispatch('login', {
              auth: {
                method: 'access token',
                token: new_value
              }
            });
          }],
          on_change: [function(store, new_value, old_value) {
            console.log('Your access token has changed from', old_value, 'to', new_value);
          }]
          on_unset: [function(store, new_value, old_value) {
            console.log(new_value); //logs "null".
            store.dispatch('logout');
          }]
        }
  }]
});
```

After defining your `basement`, define your vuex store as usual, but add the special `global commit` action as follows: 
```js
const store = new Vuex.Store({
    state: {...},
    mutations: {...},
    actions: {
        "global commit": basement.global_commit,
        .
        .
        .
    }
});
```

Then, finally, attach the the `basement` to the newly created store:

```js
basement.attach_to_store(store);
```

If the basement detects that there is already a persisted state from an earlier session or an already opened tab, attaching the store also results in the state getting initialized by mergin the basement state with default state.

Now you are ready to commit a mutation that originates from one tab in *all* other open tabs/windows as well, resulting in state (or partial state) synchronization:

```js
let mutation = {
    type: 'set access token', //the name of the mutation as defined in your store.
    payload: {
        token: 'some token string'
    }
};

store.dispatch('global commit', mutation);
```

Note that `global commit` syncs the state through issuing the same commit originating from one source to all open tabs/windows associated with your app via a `store.commit(...);` statement, which means that you can still reason about your app in a logical manner. For example, when using the vue dev-tools, you will see the commit registered as if the user has taken some action that triggered the state change. In other words -- nothing spooky will appear (or fail to appear!) in your logs and you can still do time-travel debugging. The only difference is that the commit will be issued not from a user interaction with the idle tabs but from another tab.

Also, if your global commits result in changing the value of any paths in the state that you have included in your `basement` instance earlier to persist, the path value is updated in localStorage and all associated reactions get triggered as appropriate. Note that regular commits that do not get executed through a global commit, even ones that change an included path's value, do not trigger persistance or the associated reactions.

Additionally, global commits return a `Promise`, which gets resolved once all open tabs/windows have updated their states:

```js
store.dispatch('global commit', first_mutation).then(function() {
    console.log('state is now in sync in all open tabs/windows after first_mutation.');
    store.dispatch('global commit', second_mutation).then(function() {
        ...
    });
});
```

One caveat, though: browsers tend to throttle javascript execution for tabs/windows out of focus. This means that, at least in chrome, the promise will take a delay of around one second before resolving. Note that this delay is inherent in this particular browser resource optimization and not the underlying logic of `global commit`. Also, if the user brings any of the out-of-focus tabs back into focus, the delay is cut short since the throttling is automatically removed by the browser. In other words: This is ONLY an issue if you want to wait for *idle* tabs to finish execution, and the user hopping between open tabs will NOT notice any delays whatsoever.


# License
MIT license.
