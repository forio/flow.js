import { makeConsensusService } from './consensus-utils';

export default function ConsensusStatusHandler(config, notifier) {
    const options = $.extend(true, {
        serviceOptions: {},
        channelOptions: {},
    }, config);

    const { getConsensus } = options.serviceOptions;

    return {
        subscribeHandler: function (topics) {
            return getConsensus().then((consensus)=> {
                return topics.reduce((accum, topic)=> {
                    if (consensus[topic] !== undefined) {
                        accum.push({ name: topic, value: consensus[topic] });
                    }
                    return accum;
                }, []);
            });
        },
        publishHandler: function (topics) {
            return getConsensus().then((consensus)=> {
                if (topics.length > 1 || topics[0].name !== 'close') {
                    throw new TypeError('Can only publish `close` on consensus:status');
                }
                const cs = makeConsensusService(consensus);
                return cs.forceClose().then(()=> topics);
            });
        }
    };
}
