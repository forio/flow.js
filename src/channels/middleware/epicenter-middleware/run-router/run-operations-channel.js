/**
 * ## Operations Channel
 *
 * Channels allow Flow.js to make requests of underlying APIs. The Operations Channel lets you track when model operations are called. Specifically, the most common use cases for the Operations Channel are:
 *
 * * `publish`: Call a model operation: 
 *
 *       // using channel explicitly
 *       Flow.channel.operations.publish('myOperation', myOperParam);
 *
 *       // equivalent call using Flow.js custom HTML attributes
 *       <button data-f-on-click="myOperation(myOperParam)">Click me</button>
 *
 * * `subscribe`: Receive notifications when a model variable is updated:
 *
 *       // use subscribe and a callback function 
 *       // to listen and react when a model variable has been updated
 *       Flow.channel.operations.subscribe('myOperation',
 *          function() { console.log('called!'); } );
 *
 * See additional information on the [Channel Configuration Options and Methods](../../channel-manager/) page.
 */

export default function RunOperationsChannel($runServicePromise) {
    return {
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = topics.map(function (topic) {
                    return { name: topic.name, params: topic.value };
                });
                return runService.serial(toSave).then(function (result) {
                    var toReturn = result.map(function (response, index) {
                        return { name: topics[index].name, value: response };
                    });
                    return toReturn;
                });
            });
        }
    };
}
