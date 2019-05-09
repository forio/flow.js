export default function RunOperationsRouteHandler($runServicePromise, notifier) {
    return {
        /**
         * 
         * @param {Publishable[]} operationsResponse 
         */
        notify: function (operationsResponse) {
            return notifier([].concat(operationsResponse));
        },

        subscribeHandler: function () {
            return []; //Cannot subscribe to operations
        },
        publishHandler: function (topics, options) {
            return $runServicePromise.then(function (runService) {
                const toSave = topics.map(function (topic) {
                    return { name: topic.name, params: topic.value };
                });
                return runService.serial(toSave).then(function (result) {
                    const toReturn = result.map(function (response, index) {
                        return { name: topics[index].name, value: response.result };
                    });
                    return toReturn;
                });
            });
        }
    };
}
