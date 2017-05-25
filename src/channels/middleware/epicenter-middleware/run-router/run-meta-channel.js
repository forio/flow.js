/**
 * ## Meta Channel
 *
 * Channels allow Flow.js to make requests of underlying APIs. The Meta Channel lets you track when run metadata (fields in the run record) are updated -- both default run metadata and any additional metadata you choose to add to a run. Specifically, the most common use cases for the Meta Channel are:
 *
 * * `publish`: Update a run metadata field: 
 *
 *       // using channel explicitly
 *       Flow.channel.publish('meta:myRunField', newValue);
 *
 *       // equivalent call using Flow.js custom HTML attributes
 *       <input type="text" data-f-bind="meta:myRunField" value="newValue"></input>
 *
 * * `subscribe`: Receive notifications when a run metadata field is updated:
 *
 *       // use subscribe and a callback function 
 *       // to listen and react when the metadata has been updated
 *       Flow.channel.subscribe('meta:myRunField',
 *          function() { console.log('updated!'); } );
 *
 *       // similar call using Flow.js custom HTML attributes
 *       // the span automatically updates when the metadata is updated
 *       // however, there is no opportunity for a callback function
 *       <span data-f-bind="meta:myRunField"></span>
 *
 * See additional information on the [Channel Configuration Options and Methods](../../channel-manager/) page.
 */


import { objectToArray, arrayToObject } from 'channels/channel-utils';

export default function RunMetaChannel($runServicePromise, notifier) {

    function mergeAndSend(runMeta, requestedTopics) {
        var toSend = ([].concat(requestedTopics)).reduce(function (accum, meta) {
            if (runMeta[meta] !== undefined) {
                accum.push({ name: meta, value: runMeta[meta] });
            }
            return accum;
        }, []);
        return notifier(toSend);
    }
    return {
        subscribeHandler: function (topics) {
            return $runServicePromise.then(function (runService) {
                if (runService.runMeta) {
                    return $.Deferred().resolve(mergeAndSend(runService.runMeta, topics)).promise();
                }

                if (!runService.loadPromise) {
                    runService.loadPromise = runService.load().then(function (data) {
                        runService.runMeta = data;
                        return data;
                    });
                } 
                return runService.loadPromise.then(function (data) {
                    mergeAndSend(data, topics);
                });
            });
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = arrayToObject(topics);
                return runService.save(toSave).then(function (res) {
                    runService.runMeta = $.extend({}, true, runService.runMeta, res);
                    return objectToArray(res);
                });
            });
        }
    };
}
