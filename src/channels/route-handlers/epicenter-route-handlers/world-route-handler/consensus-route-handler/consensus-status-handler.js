import { makeConsensusService } from './consensus-utils';

export default function ConsensusStatusHandler(getCurrent, notifier) {
    return {
        subscribeHandler: function (topics) {
            return getCurrent().then((consensus)=> {
                return topics.reduce((accum, topic)=> {
                    if (consensus[topic] !== undefined) {
                        accum.push({ name: topic, value: consensus[topic] });
                    }
                    return accum;
                }, []);
            });
        },
        publishHandler: function (topics) {
            return getCurrent().then((consensus)=> {
                if (topics.length > 1 || topics[0].name !== 'close') {
                    throw new TypeError('Can only publish `close` on consensus:status');
                }
                const cs = makeConsensusService(consensus);
                return cs.forceClose().then(()=> topics);
            });
        }
    };
}
