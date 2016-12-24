var OPERATIONS_PREFIX = 'operation:';
exports.publishHander = function (runservice, inputObj, options) {
    var toSave = Object.keys(inputObj).reduce(function (accum, key) {
        var val = inputObj[key];
        if (key.indexOf(OPERATIONS_PREFIX) === 0) {
            key = key.replace(OPERATIONS_PREFIX, '');
            accum.push({ name: key, params: val });
        }
        return accum;
    }, []);

    if (!toSave.length) {
        return $.Deferred().resolve(inputObj).promise();
    }
    if (_.result(options, 'readOnly')) {
        var msg = 'Tried to publish to a read-only operations channel';
        console.warn(msg, toSave);
        return $.Deferred().reject(msg).promise();
    }

    return runservice.serial(toSave).then(function (result) {
        ([].concat(result)).forEach(function (res) {
            var key = OPERATIONS_PREFIX + res.name;
            inputObj[key] = res.result;
        });
        return inputObj;
    });
};
