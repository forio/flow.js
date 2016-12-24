exports.publishHander = function (runservice, toSave, options) {
    if (_.isEmpty(toSave)) {
        return $.Deferred().resolve(toSave).promise();
    }
    if (_.result(options, 'readOnly')) {
        var msg = 'Tried to publish to a read-only meta channel';
        console.warn(msg, toSave);
        return $.Deferred().reject(msg).promise();
    }
    return runservice.save(toSave);
};
