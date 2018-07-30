import { makeConsensusService } from './consensus-utils';
import { objectToPublishable } from 'channels/channel-utils';

export default function ConsensusStatusHandler(config, notifier) {
    const options = $.extend(true, {
        serviceOptions: {},
        channelOptions: {},
    }, config);

    const { getConsensus, getSession } = options.serviceOptions;

    function normalizePlayers(rolePlayerMap) {
        const session = getSession();
        const normalized = Object.keys(rolePlayerMap).reduce((accum, role)=> {
            const playersForRole = rolePlayerMap[role];
            const playersWithRole = playersForRole.map((p)=> {
                const player = p.user || p; //submitted puts user under an extra object because of course
                return Object.assign({}, player, {
                    role: role,
                    userName: player.userName.split('/')[0], //API adds user/project because of course
                    name: player.lastName,
                    isMe: player.userName === session.userName, // so you can do :submitted:users | reject('isMe')
                });
            });
            accum = accum.concat(playersWithRole);
            return accum;
        }, []);
        return normalized;
    }
    function normalizeConsensus(consensus) {
        const session = getSession();
        const submitted = normalizePlayers(consensus.submitted);
        const amWaiting = submitted.find((u)=> u.userName === session.userName);
        const normalized = $.extend(true, {}, consensus, {
            amWaiting: !!amWaiting,
            submitted: submitted,
            pending: normalizePlayers(consensus.pending),
        });
        return normalized;
    }

    return {
        notify: function (consensus) {
            const normalizedConsensus = normalizeConsensus(consensus);
            notifier(objectToPublishable(normalizedConsensus));
        },
        subscribeHandler: function (topics) {
            return getConsensus().then((consensus)=> {
                const normalizedConsensus = normalizeConsensus(consensus);
                return topics.reduce((accum, topic)=> {
                    if (normalizedConsensus[topic] !== undefined) {
                        accum.push({ name: topic, value: normalizedConsensus[topic] });
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
