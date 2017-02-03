var RunChannel = require('./run-router');
var knownRunIDServiceChannels = {};

module.exports = function (runid, options, notifier) {
    var runChannel = knownRunIDServiceChannels[runid];
    if (!runChannel) {
        var newNotifier = notifier.bind(null, runid);
        var runOptions = $.extend(true, {}, options, { serviceOptions: { id: runid } });
        runChannel = new RunChannel(runOptions, newNotifier);
        knownRunIDServiceChannels[runid] = runChannel;
    }
    return runChannel;
};
