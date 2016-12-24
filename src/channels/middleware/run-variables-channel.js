var debounceAndMerge = require('utils/general').debounceAndMerge;
var VARIABLES_PREFIX = 'variable:';

exports.publishHander = function (runservice, inputObj, options) {
    var toSave = Object.keys(inputObj).reduce(function (accum, key) {
        var val = inputObj[key];
        if (key.indexOf(VARIABLES_PREFIX) === 0) {
            key = key.replace(VARIABLES_PREFIX, '');
            accum[key] = val;
        }
        return accum;
    }, {});

    if (_.isEmpty(toSave)) {
        return $.Deferred().resolve(inputObj).promise();
    }
    if (_.result(options, 'readOnly')) {
        var msg = 'Tried to publish to a read-only variables channel';
        console.warn(msg, toSave);
        return $.Deferred().reject(msg).promise();
    }

    return runservice.variables().save(toSave).then(function () {
        return inputObj;
    });
};
