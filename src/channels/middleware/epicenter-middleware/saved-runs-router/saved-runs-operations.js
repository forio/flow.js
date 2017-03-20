var { includes } = _;
var { when } = $;

export default function SavedRunsOperationsChannel(savedRunService) {
    var VALID_OPERATIONS = ['remove', 'save', 'mark'];
    return {
        publishHandler: function (toPublish, options) {
            var savePromises = toPublish.reduce(function (filtered, topic) {
                if (includes(VALID_OPERATIONS, topic.name)) {
                    var prom = savedRunService[topic.name](topic.value);
                    filtered.push(prom);
                } else {
                    console.warn('Unsupported operation on saved runs', topic.name);
                }
                return filtered;
            }, []);
            when.apply(null, savePromises).then(function () {
                return toPublish;
            });
        }
    };
}
