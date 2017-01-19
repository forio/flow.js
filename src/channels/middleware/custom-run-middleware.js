var runChannelFactory = require('./run-channel-factory');
var regexpMatch = require('./middleware-utils').regex;

var sampleRunidLength = '000001593dd81950d4ee4f3df14841769a0b'.length;
var runidRegex = new RegExp('^(?:.{' + sampleRunidLength + '}):');

module.exports = function (options, notifier) {
    return {
        match: regexpMatch(runidRegex),
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
