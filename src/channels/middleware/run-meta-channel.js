module.exports = function () {

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
        subscribeHandler: function (runService, topics) {
            if (runService.runMeta) {
                return $.Deferred().resolve(mergeAndSend(runService.runMeta, topics)).promise();
            } else {
                return runService.load().then(function (data) {
                    runService.runMeta = data;
                    return mergeAndSend(data, topics);
                });
            }
            
        },
        publishHander: function (runService, toSave, options) {
            return runService.save(toSave).then(function (res) {
                runService.runMeta = $.extend({}, true, runService.runMeta, res);
                return res;
            });
        }
    };
};
