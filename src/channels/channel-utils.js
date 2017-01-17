function findBestHandler(topic, handlers) {
    for (var i = 0; i < handlers.length; i++) {
        var thishandler = handlers[i];
        var match = thishandler.match(topic);
        if (match !== false) {
            return $.extend(true, {}, thishandler, { match: match });
        }
    }
}
module.exports = {
    normalizePublishInputs: function (topic, publishValue, options) {
        if ($.isPlainObject(topic)) {
            var mapped = Object.keys(topic).map(function (t) {
                return { name: t, value: topic[t] };
            });
            return { toPublish: mapped, options: publishValue };
        }
        if ($.isArray(topic)) {
            return { toPublish: topic, options: publishValue };
        }
        return { toPublish: [{ name: topic, value: publishValue }], options: options };
    },

    findBestHandler: findBestHandler,

    groupByHandlers: function (topics, handlers) {
        handlers = handlers.map(function (h, index) {
            h.key = index;
            return h;
        });
        var topicMapping = ([].concat(topics)).reduce(function (accum, topic) {
            var bestHandler = findBestHandler(topic, handlers);
            if (!accum[bestHandler.key]) {
                bestHandler.topics = [];
                accum[bestHandler.key] = bestHandler;
            }
            topic = topic.replace(bestHandler.match, '');
            accum[bestHandler.key].topics.push(topic);
            return accum;
        }, {});
        return _.values(topicMapping);
    },

    groupSequentiallyByHandlers: function (data, handlers) {
        handlers = handlers.map(function (h, index) {
            h.key = index;
            return h;
        });
        var grouped = data.reduce(function (accum, dataPt) {
            var lastHandler = accum[accum.length - 1];
            var bestHandler = findBestHandler(dataPt.name, handlers);
            dataPt.name = dataPt.name.replace(bestHandler.match, '');
            if (lastHandler && bestHandler.key === lastHandler.key) {
                lastHandler.data.push(dataPt);
            } else {
                accum.push($.extend({}, bestHandler, { data: [dataPt] }));
            }
            return accum;
        }, []);
        return grouped;
    }
};
