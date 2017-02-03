var RunChannel = require('./run-router');
var knownRunIDServiceChannels = {};

module.exports = function (runid, options, notifier) {
    var runChannel = knownRunIDServiceChannels[runid];
    if (!runChannel) {
        var runOptions = $.extend(true, {}, options, { serviceOptions: { id: runid } });
        runChannel = new RunChannel(runOptions, notifier);
        knownRunIDServiceChannels[runid] = runChannel;
    }
    return runChannel;
};
