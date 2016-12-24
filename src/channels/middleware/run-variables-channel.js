var debounceAndMerge = require('utils/general').debounceAndMerge;
var VARIABLES_PREFIX = 'variable:';

var debouncedFetch = debounceAndMerge(function (variables, runService, notifyCallback) {
    runService.variables().query(variables).then(function (result) {
        var toNotify = _.reduce(result, function (accum, value, variable) {
            var key = VARIABLES_PREFIX + variable;
            accum[key] = value;
            return accum;
        }, {});
        notifyCallback(toNotify);
    });
}, 200, [function mergeVariables(accum, newval) {
    if (!accum) {
        accum = [];
    }
    return _.uniq(accum.concat(newval));
}]);

exports.subscribeHandler = function (topics, options, runservice, runData, notifier) {
    var toFetch = ([].concat(topics)).reduce(function (accum, topic) {
        if (topic.indexOf(VARIABLES_PREFIX) === 0) {
            var metaName = topic.replace(VARIABLES_PREFIX, '');
            accum.push(metaName);
        }
        return accum;
    }, []);

    if (_.result(options, 'autoFetch') && toFetch.length) {
        debouncedFetch(toFetch, runservice, notifier);
    }
};


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
