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
            if (!runService.loadMeta) {
                runService.loadMeta = runService.load();
            } 
            return runService.loadMeta.then(function (data) {
                return mergeAndSend(data, topics);
            });
        },
        publishHandler: function (runService, toSave, options) {
            return runService.save(toSave).then(function (res) {
                runService.runMeta = $.extend({}, true, runService.runMeta, res);
                return res;
            });
        }
    };
};
