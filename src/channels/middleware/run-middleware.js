module.exports = function (config) {
    //TODO: Pass in a 'notify' function here?
    //
    var rm = new window.F.manager.RunManager({ run: config });
    // var rs = rm.run;

    var $creationPromise = rm.getRun().then(function () {
        return rm.run;
    });
    // rs.currentPromise = $creationPromise;

    //TODO: Figure out 'on init'
    var publicAPI = {
        subscribeInterceptor: function (topicsArray) {
            var variablesToFetch = topicsArray.filter(function (topic) {
                return topic.indexOf('variables:') === 0;
            });
            // TODO: Pre-fetch checking happens here
            return $creationPromise.then(function (runService) {
                return runService.variables().query(variablesToFetch);
            });
        },
        //TODO: Ensure one broken promise doesn't BORK the entire thing
        publishInterceptor: function (inputObj) {
            return $creationPromise.then(function (runService) {
                //TODO: This means variables are always set before operations happen, make that more dynamic and by occurence order
                //TODO: Have publish on subsmanager return a series of [{ key: val} ..] instead of 1 big object?
                var toSave = Object.keys(inputObj).reduce(function (accum, key) {
                    if (key.indexOf('variables:') === 0) {
                        accum.variables[key] = inputObj[key];
                    } else if (key.indexOf('operations:') === 0) {
                        accum.operations[key] = inputObj[key];
                    }
                    return accum;
                }, { variables: {}, operations: {} });
                return runService.variables().save(toSave.variables);
            });
        }
    };

    $.extend(this, publicAPI);
};
