## Variables Route Handler

The Variables Route Handler lets you track when model variables are updated. Some common use cases are:

* `publish`: Update a model variable: 
```js
// using channel explicitly
Flow.channel.publish('variables:myVariable', newValue);

// equivalent call using Flow.js custom HTML attributes
<input type="text" data-f-bind="myVariable" value="newValue"></input>
```

* `subscribe`: Receive notifications when a model variable is updated:
```js
// use subscribe and a callback function 
// to listen and react when a model variable has been updated
Flow.channel.subscribe('variables:myVariable',
    function() { console.log('updated!'); } );

// similar call using Flow.js custom HTML attributes
// the span automatically updates when the variable is updated
// however, there is no opportunity for a callback function
<span data-f-bind="myVariable"></span>
```

See additional information on the [Route Configuration Options and Methods](../../channel-manager/) page.
