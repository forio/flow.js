module.exports = function () {
    return {
        publishHandler: function (runService, toSave, options) {
            toSave = Object.keys(toSave).reduce(function (accum, key) {
                accum.push({ name: key, params: toSave[key] });
                return accum;
            }, []);
            return runService.serial(toSave).then(function (result) {
                var toReturn = toSave.reduce(function (accum, operation, index) {
                    accum[operation.name] = result[index];
                    return accum;
                }, {});
                return toReturn;
            });
        }
    };
};
