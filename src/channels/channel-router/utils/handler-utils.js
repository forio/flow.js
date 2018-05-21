import _ from 'lodash';

/**
 * @param {String} topic
 * @param {Handler[]} handlers
 * @param {any} [matchOptions] options to pass on to matcher
 * @return {MatchedHandler | undefined}
 */
export function findBestHandler(topic, handlers, matchOptions) {
    for (var i = 0; i < handlers.length; i++) {
        var thishandler = handlers[i];
        var match = thishandler.match(topic, matchOptions);
        if (match !== false) {
            return $.extend(true, {}, thishandler, { matched: match });
        }
    }
    return undefined;
}

/**
 * [groupByHandlers description]
 * @param  {String[]} topics   List of topics to match. Format can be anything your handler.match function handles
 * @param  {Handler[]} handlers Handlers of type [{ match: func }]
 * @return {MatchedHandler[]} The handler array with each item now having an additional 'data' attr added to it
 */
export function groupByHandlers(topics, handlers) {
    handlers = handlers.map(function (h, index) {
        h.key = index;
        return h;
    });
    var topicMapping = ([].concat(topics)).reduce(function (accum, topic) {
        var bestHandler = findBestHandler(topic, handlers);
        if (bestHandler) {
            //if handler matches different strings treat both as different handlers
            var key = bestHandler.key + bestHandler.matched;
            if (!accum[key]) {
                bestHandler.data = [];
                accum[key] = bestHandler;
            }
            accum[key].data.push(topic);
        }
        return accum;
    }, {});
    return _.values(topicMapping);
}

/**
 * Takes a `publish` dataset and groups it by handler maintaining the data sequence
 * @param  {Publishable[]} data     Of the form [{ name: 'X', }]
 * @param  {Handler[]} handlers Handlers of type [{ match: func }]
 * @return {MatchedHandler[]} The handler array with each item now having an additional 'data' attr added to it
 */
export function groupSequentiallyByHandlers(data, handlers) {
    handlers = handlers.map(function (h, index) {
        h.key = index;
        return h;
    });
    var grouped = data.reduce(function (accum, dataPt) {
        var lastHandler = accum[accum.length - 1];
        var bestHandler = findBestHandler(dataPt.name, handlers, true);
        if (bestHandler) {
            if (lastHandler && bestHandler.key === lastHandler.key) {
                lastHandler.data.push(dataPt);
            } else {
                accum.push($.extend({}, bestHandler, { data: [dataPt] }));
            }
        } else {
            accum.push({ data: [dataPt], matched: false });
        }
        return accum;
    }, []);
    return grouped;
}
