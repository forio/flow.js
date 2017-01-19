var runChannelFactory = require('./run-channel-factory');

module.exports = function (options, notifier) {
    return {
        subscribeHandler: function (topics, prefix) {
            var runid = prefix.replace(':', '');
            var channel = runChannelFactory(runid, options, notifier);
            return channel.subscribeHandler(topics);
        },
        publishHandler: function (topics, prefix) {
            var runid = prefix.replace(':', '');
            var channel = runChannelFactory(runid, options, notifier);
            return channel.publishHandler(topics);
        }
    };
};
