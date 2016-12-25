var META_PREFIX = 'meta:';

exports.subscribeHandler = function (topics, options, runservice, runData, notifier) {
    var toSend = topics.reduce(function (accum, meta) {
        if (runData[meta] !== undefined) {
            accum[META_PREFIX + meta] = runData[meta];
        }
        return accum;
    }, {});
    notifier(toSend);
};

exports.publishHander = function (runservice, toSave, options) {
    return runservice.save(toSave);
};
