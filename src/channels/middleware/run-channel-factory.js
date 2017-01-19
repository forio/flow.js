var RunChannel = require('./run-middleware');
var knownRunIDServiceChannels = {};

module.exports = function (runid, options, notifier) {
    var runChannel = knownRunIDServiceChannels[runid];
    if (!runChannel) {
        var newNotifier = notifier.bind(null, runid + ':');
        var runOptions = $.extend(true, {}, options, { id: runid });
        runChannel = new RunChannel({ serviceOptions: runOptions }, newNotifier);
        knownRunIDServiceChannels[runid] = runChannel;
    }
    return runChannel;
};
