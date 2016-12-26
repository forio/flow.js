var debounceAndMerge = require('utils/general').debounceAndMerge;

module.exports = function () {

    var fetchFn = function (runService) {
        if (!runService.patchedFetch) {
            runService.patchedFetch = debounceAndMerge(function (variables) {
                console.log('input', variables);
                return runService.variables().query(variables).then(function (r) {
                    console.log('response', r);
                    return r;
                });
            }, 200, [function mergeVariables(accum, newval) {
                if (!accum) {
                    accum = [];
                }
                return _.uniq(accum.concat(newval));
            }]);
        }
        return runService.patchedFetch;
    };
     

    var knownTopics = [];
    return { 
        fetch: function (runService, callback) {
            return fetchFn(runService)(knownTopics);
        },
        subscribeHandler: function (runService, topics) {
            knownTopics = _.uniq(knownTopics.concat(topics));
            console.log(fetchFn(runService));
            return fetchFn(runService)(topics);
        },
        publishHander: function (runService, toSave, options) {
            return runService.variables().save(toSave);
        }
    };
};
