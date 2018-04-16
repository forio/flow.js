import { objectToPublishable, publishableToObject } from 'channels/channel-utils';
import { intersection } from 'lodash';

export default function RunMetaChannel($runServicePromise, notifier) {

    function mergeAndSend(runMeta, requestedTopics) {
        var toSend = ([].concat(requestedTopics)).reduce(function (accum, meta) {
            accum.push({ name: meta, value: runMeta[meta] });
            return accum;
        }, []);
        return notifier(toSend);
    }
    return {
        subscribeHandler: function (topics, options) {
            topics = [].concat(topics);
            return $runServicePromise.then(function (runService) {
                var cachedValues = intersection(Object.keys(runService.runMeta || {}), topics);
                if (options.autoFetch === false) {
                    return $.Deferred().resolve({}).promise();
                } else if (cachedValues.length === topics.length) {
                    //FIXME: Add 'updated time' to meta, and fetch if that's < debounce interval -- use the custom debounce fn with the custom merge (debounce save as well?)
                    //Make run service factory return patched run-service?
                    return $.Deferred().resolve(mergeAndSend(runService.runMeta, topics)).promise();
                } if (!runService.loadPromise) {
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
                var toSave = publishableToObject(topics);
                return runService.save(toSave).then(function (res) {
                    runService.runMeta = $.extend({}, true, runService.runMeta, res);
                    return objectToPublishable(res);
                });
            });
        }
    };
}
