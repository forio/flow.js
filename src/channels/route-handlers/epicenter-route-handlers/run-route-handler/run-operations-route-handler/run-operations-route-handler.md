## Operations Route Handler

Channels allow Flow.js to make requests of underlying APIs. The Operations Channel lets you track when model operations are called. Specifically, the most common use cases for the Operations Channel are:

* `publish`: Call a model operation: 
```js
// using channel explicitly
Flow.channel.publish('operations:myOperation', myOperParam);

// equivalent call using Flow.js custom HTML attributes
<button data-f-on-click="myOperation(myOperParam)">Click me</button>
```

* `subscribe`: Receive notifications when a model variable is updated:
```js
// use subscribe and a callback function 
// to listen and react when a model variable has been updated
Flow.channel.subscribe('operations:myOperation',
    function() { console.log('called!'); } );
```

See additional information on the [Channel Configuration Options and Methods](../../channel-manager/) page.