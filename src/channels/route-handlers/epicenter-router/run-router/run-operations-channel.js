export default function RunOperationsChannel($runServicePromise, notifier) {
    return {
        notify: function (operationsResponse) {
            const parsed = [{ name: operationsResponse.name, value: operationsResponse.result }];
            return notifier(parsed);
        },

        subscribeHandler: function () {
            return [];
        },
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
