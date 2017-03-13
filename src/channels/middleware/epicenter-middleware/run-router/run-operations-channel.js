export default function RunOperationsChannel($runServicePromise) {
    return {
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                var toSave = topics.map(function (topic) {
                    return { name: topic.name, params: topic.value };
                });
                return runService.serial(toSave).then(function (result) {
                    var toReturn = result.map(function (response, index) {
                        return { name: topics[index].name, value: response };
                    });
                    return toReturn;
                });
            });
        }
    };
}
