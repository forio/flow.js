var RunMiddleware = require('./run-manager-middleware');
var ScenarioMiddleware = require('./scenario-manager-middleware');
var CustomRunMiddleware = require('./custom-run-middleware');

var mapWithPrefix = require('channels/middleware/utils').mapWithPrefix;
var prefixMatch = require('channels/middleware/utils').prefix;

var Middleware = require('channels/middleware/general-middleware');

function getOptions(opts, key) {
    var serviceOptions = $.extend(true, {}, opts.defaults, opts[key]);
    var channelOptions = $.extend(true, {}, serviceOptions.channelOptions);
    delete serviceOptions.channelOptions;

    return { serviceOptions: serviceOptions, channelOptions: channelOptions };
}
module.exports = function (config, notifier) {
    var notifyWithPrefix = function (prefix, data) {
        notifier(mapWithPrefix(data, prefix));
    };

    var opts = $.extend(true, {}, config);

    var customRunChannelOpts = getOptions(opts, 'runid');
    var customRunChannel = new CustomRunMiddleware(customRunChannelOpts, notifyWithPrefix);

    var handlers = [
        $.extend({}, customRunChannel, { name: 'runid' })
    ];
    var prefix = '';
    if (opts.runManager) {
        prefix = config.scenarioManager ? 'run:' : '';

        var runManagerOpts = getOptions(opts, 'runManager');
        var rm = new RunMiddleware(runManagerOpts, notifyWithPrefix.bind(null, prefix));
        handlers.push($.extend({}, rm, { name: 'runManager', match: prefixMatch(prefix) }));
    }

    if (opts.scenarioManager) {
        prefix = config.runManager ? 'scenario:' : '';

        var scenarioManagerOpts = getOptions(opts, 'scenarioManager');
        var sm = new ScenarioMiddleware(scenarioManagerOpts, notifyWithPrefix.bind(null, prefix));
        handlers.push($.extend({}, sm, { name: 'scenarioManager', match: prefixMatch(prefix) }));
    }
    var middleware = new Middleware(handlers, notifier);
    return middleware;
};