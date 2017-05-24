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