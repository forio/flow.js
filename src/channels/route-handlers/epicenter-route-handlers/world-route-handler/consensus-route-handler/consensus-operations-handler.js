import { makeConsensusService } from './consensus-utils';

export default function ConsensusOperationsHandler(config, notifier) {
    const options = $.extend(true, {
        serviceOptions: {},
        channelOptions: {},
    }, config);

    const { getConsensus } = options.serviceOptions;

    return {
        subscribeHandler: function () {
            return [];
        },
        publishHandler: function (topics, options) {
            return getConsensus().then((consensus)=> {
                const actions = topics.map(function (topic) {
                    return { name: topic.name, arguments: topic.value };
                });
                const cs = makeConsensusService(consensus);
                return cs.submit(actions).then(()=> {
                    return topics;
                });
            });
        }
    };
}
