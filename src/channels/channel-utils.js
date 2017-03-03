export function findBestHandler(topic, handlers) {
    for (var i = 0; i < handlers.length; i++) {
        var thishandler = handlers[i];
        var match = thishandler.match(topic);
        if (match !== false) {
            return $.extend(true, {}, thishandler, { match: match });
        }
    }
}
export function extractOptions(options, key) {
    var opts = $.extend(true, { defaults: {} }, options);
    return $.extend(true, {}, opts.defaults, opts[key]);
}

export function normalizeParamOptions(topic, publishValue, options) {
    if (!topic) {
        return { params: [], options: {} };
    }
    if ($.isPlainObject(topic)) {
        var mapped = Object.keys(topic).map(function (t) {
            return { name: t, value: topic[t] };
        });
        return { params: mapped, options: publishValue };
    }
    if ($.isArray(topic)) {
        return { params: topic, options: publishValue };
    }
    return { params: [{ name: topic, value: publishValue }], options: options };
}

/**
 * [groupByHandlers description]
 * @param  {Array} topics   List of topics to match. Format can be anything your handler.match function handles
 * @param  {Array} handlers Handlers of type [{ match: func }]
 * @return {Array} The handler array with each item now having an additional 'data' attr added to it
 */
export function groupByHandlers(topics, handlers) {
    handlers = handlers.map(function (h, index) {
        h.key = index;
        return h;
    });
    var topicMapping = ([].concat(topics)).reduce(function (accum, topic) {
        var bestHandler = findBestHandler(topic, handlers);
        if (!accum[bestHandler.key]) {
            bestHandler.data = [];
            accum[bestHandler.key] = bestHandler;
        }
        accum[bestHandler.key].data.push(topic);
        return accum;
    }, {});
    return _.values(topicMapping);
}

/**
 * Takes a `publish` dataset and groups it by handler maintaining the data sequence
 * @param  {Array} data     Of the form [{ name: 'X', }]
 * @param  {Array} handlers Handlers of type [{ match: func }]
 * @return {Array} The handler array with each item now having an additional 'data' attr added to it
 */
export function groupSequentiallyByHandlers(data, handlers) {
    handlers = handlers.map(function (h, index) {
        h.key = index;
        return h;
    });
    var grouped = data.reduce(function (accum, dataPt) {
        var lastHandler = accum[accum.length - 1];
        var bestHandler = findBestHandler(dataPt.name, handlers);
        if (lastHandler && bestHandler.key === lastHandler.key) {
            lastHandler.data.push(dataPt);
        } else {
            accum.push($.extend({}, bestHandler, { data: [dataPt] }));
        }
        return accum;
    }, []);
    return grouped;
}
