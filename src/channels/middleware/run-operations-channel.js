module.exports = function () {
    return {
        publishHandler: function (runService, topics, options) {
            var toSave = topics.map(function (topic) {
                return { name: topic.name, params: topic.value };
            });
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
