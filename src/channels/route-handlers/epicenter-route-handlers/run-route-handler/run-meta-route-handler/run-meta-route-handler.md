## Run Meta Route Handler

The Meta Channel lets you track when run metadata (fields in the run record) are updated -- both default run metadata and any additional metadata you choose to add to a run. Some common use cases are:

* `publish`: Update a run metadata field: 

```js
// using channel explicitly
Flow.channel.publish('meta:myRunField', newValue);

// equivalent call using Flow.js custom HTML attributes
<input type="text" data-f-bind="meta:myRunField" value="newValue"></input>
```

* `subscribe`: Receive notifications when a run metadata field is updated:

```
// use subscribe and a callback function 
// to listen and react when the metadata has been updated
Flow.channel.subscribe('meta:myRunField',
    function() { console.log('updated!'); } );

// similar call using Flow.js custom HTML attributes
// the span automatically updates when the metadata is updated
// however, there is no opportunity for a callback function
<span data-f-bind="meta:myRunField"></span>
```

See additional information on the [Channel Configuration Options and Methods](../../channel-manager/) page.