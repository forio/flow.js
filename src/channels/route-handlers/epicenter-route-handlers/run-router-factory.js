import RunRouteHandler from './run-route-handler';
var knownRunIDServiceChannels = {};

export default function (runid, options, notifier) {
    var runChannel = knownRunIDServiceChannels[runid];
    if (!runChannel) {
        var runOptions = $.extend(true, {}, options, { serviceOptions: { id: runid } });
        runChannel = new RunRouteHandler(runOptions, notifier);
        knownRunIDServiceChannels[runid] = runChannel;
    }
    return runChannel;
}
