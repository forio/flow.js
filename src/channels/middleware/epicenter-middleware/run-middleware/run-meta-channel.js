module.exports = function ($runServicePromise) {

    function mergeAndSend(runMeta, requestedTopics) {
        var toSend = ([].concat(requestedTopics)).reduce(function (accum, meta) {
            if (runMeta[meta] !== undefined) {
                accum[meta] = runMeta[meta];
            }
            return accum;
        }, {});
        return toSend;
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
                    return mergeAndSend(data, topics);
                });
            });
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = topics.reduce(function (accum, topic) {
                    accum[topic.name] = topic.value;
                    return accum;
                }, {});
                return runService.save(toSave).then(function (res) {
                    runService.runMeta = $.extend({}, true, runService.runMeta, res);
                    return res;
                });
            });
        }
    };
};
