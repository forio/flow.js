module.exports = function () {
    return {
        publishHander: function (runService, toSave, options) {
            toSave = Object.keys(toSave).reduce(function (accum, key) {
                accum.push({ name: key, params: toSave[key] });
                return accum;
            }, []);
            return runService.serial(toSave).then(function (result) {
                var mapped = ([].concat(result)).reduce(function (accum, res) {
                    accum[res.name] = res.result;
                    return accum;
                });
                return mapped;
            });
        }
    };
};
