exports.subscribeHandler = function (topics, runservice, runData, callback) {
    var toSend = topics.reduce(function (accum, meta) {
        if (runData[meta] !== undefined) {
            accum[meta] = runData[meta];
        }
        return accum;
    }, {});
    callback(toSend);
};

exports.publishHander = function (runservice, toSave, options) {
    return runservice.save(toSave);
};
