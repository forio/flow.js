var runChannelFactory = require('./run-router-factory');
var regexpMatch = require('channels/middleware/utils').regex;

var sampleRunidLength = '000001593dd81950d4ee4f3df14841769a0b'.length;
var runidRegex = new RegExp('^(?:.{' + sampleRunidLength + '}):');

module.exports = function (options, notifier) {
    if (!options) options = {};

    var opts = {};
    opts.serviceOptions = options.serviceOptions && options.serviceOptions.run ? options.serviceOptions.run : {};
    opts.channelOptions = options.channelOptions;

    return {
        match: regexpMatch(runidRegex),
        subscribeHandler: function (topics, prefix) {
            var runid = prefix.replace(':', '');
            var channel = runChannelFactory(runid, opts, notifier);
            return channel.subscribeHandler(topics);
        },
        publishHandler: function (topics, prefix) {
            var runid = prefix.replace(':', '');
            var channel = runChannelFactory(runid, opts, notifier);
            return channel.publishHandler(topics);
        }
    };
};
