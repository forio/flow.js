const { F } = window;

export default function RunsRouter(options, notifier, channelManagerContext) {
    var runService = new F.service.Run(options.serviceOptions.run);

    var topicParamMap = {};

    function extractFromTopic(topicString) {
        var commaRegex = /,(?![^[]*])/;
        var [filters, variables] = topicString.split(')(');

        filters = filters.replace('(', '').replace(')', '');
        var filterParam = filters.split(';').reduce((accum, filter)=> {
            var [key, val] = filter.split('=');
            accum[key] = val;
            return accum;
        }, {});

        variables = variables.replace('(', '').replace(')', '');
        variables = variables.split(commaRegex);

        return { filter: filterParam, variables: variables };
    }

    function fetch(topic) {
        var params = extractFromTopic(topic);
        return runService.query(params.filter, { include: params.variables }).then((runs)=> {
            notifier([{ name: topic, value: runs }]);
            return runs;
        });
    }

    return { 
        fetch: fetch,

        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            console.log('unsubs');
            // knownTopics = remainingTopics;
        },
        subscribeHandler: function (topics) {
            var topic = ([].concat(topics))[0];

            var params = extractFromTopic(topic);

            if (topicParamMap[topic]) {
                channelManagerContext.unsubscribe(topicParamMap[topic]);
            }
            return fetch(topic).then(function (runs) {
                runs.forEach((run)=> {
                    var subscriptions = Object.keys(params.filter).map((filter)=> run.id + ':meta:' + filter);
                    var subsid = channelManagerContext.subscribe(subscriptions, function () {
                        fetch(topic);
                    }, { batch: false, autoLoad: false, cache: false });
                    topicParamMap[topic] = subsid;

                });
                return runs;
            });
        }
    };
}
