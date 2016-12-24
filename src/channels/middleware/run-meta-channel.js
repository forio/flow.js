var META_PREFIX = 'meta:';

exports.subscribeHandler = function (topics, options, runservice, runData, notifier) {
    var toFetch = ([].concat(topics)).reduce(function (accum, topic) {
        if (topic.indexOf(META_PREFIX) === 0) {
            var metaName = topic.replace(META_PREFIX, '');
            accum.push(metaName);
        }
        return accum;
    }, []);

    if (_.result(options, 'autoFetch') && toFetch.length) {
        var toSend = toFetch.reduce(function (accum, meta) {
            if (runData[meta] !== undefined) {
                accum[META_PREFIX + meta] = runData[meta];
            }
            return accum;
        }, {});
        notifier(toSend);
    }
};

exports.publishHander = function (runservice, inputObj, options) {
    var toSave = Object.keys(inputObj).reduce(function (accum, key) {
        var val = inputObj[key];
        if (key.indexOf(META_PREFIX) === 0) {
            key = key.replace(META_PREFIX, '');
            accum[key] = val;
        }
        return accum;
    }, {});

    if (_.isEmpty(toSave)) {
        return $.Deferred().resolve(inputObj).promise();
    }
    if (_.result(options, 'readOnly')) {
        var msg = 'Tried to publish to a read-only meta channel';
        console.warn(msg, toSave);
        return $.Deferred().reject(msg).promise();
    }
    return runservice.save(toSave).then(function () {
        return inputObj;
    });
};
