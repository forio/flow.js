const { F } = window;

export default function RunsRouter(options, notifier, channelManagerContext) {
    var runService = new F.service.Run(options.serviceOptions.run);

    var topicParamMap = {};

    function extractFiltersFromTopic(topicString) {
        var filters = topicString.replace('(', '').replace(')', '');
        var filterParam = filters.split(';').reduce((accum, filter)=> {
            var [key, val] = filter.split('=');
            if (val) {
                val = true;
            }
            accum[key] = val;
            return accum;
        }, {});
        return filterParam;
    }

    function fetch(topic, variables) {
        var filters = extractFiltersFromTopic(topic);
        return runService.query(filters, { include: variables }).then((runs)=> {
            notifier([{ name: topic, value: runs }]);

            if (topicParamMap[topic]) {
                Object.keys(topicParamMap[topic]).forEach((runid)=> {
                    channelManagerContext.unsubscribe(topicParamMap[topic][runid]);
                });
            }
            
            return runs;
        });
    }

    return { 
        fetch: fetch,

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            console.log('unsubs');
            // knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics, matched, options) {
            var topic = ([].concat(topics))[0];

            var filters = extractFiltersFromTopic(topic);
            var variables = options && options.include;

     
            return fetch(topic, variables).then(function (runs) {
                var subsMap = {};
                runs.forEach((run)=> {
                    var subscriptions = Object.keys(filters).map((filter)=> run.id + ':meta:' + filter);
                    var subsid = channelManagerContext.subscribe(subscriptions, function () {
                        fetch(topic, variables);
                    }, { batch: false, autoLoad: false, cache: false });
                    subsMap[run.id] = subsid;
                });

                topicParamMap[topic] = subsMap;
                return runs;
            });
        }
    };
}
