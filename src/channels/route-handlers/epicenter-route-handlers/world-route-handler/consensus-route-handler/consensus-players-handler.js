import { objectToPublishable } from '../../../../channel-utils';

export default function ConsensusPlayersHandler(config, notifier) {
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
                return Object.assign({}, p, {
                    role: role,
                    name: p.lastName,
                    isMe: p.userName === session.userName, // so you can do :submitted:users | reject('isMe')
                });
            });
            accum = accum.concat(playersWithRole);
            return accum;
        }, []);
        return normalized;
    }
    return {
        notify: function (consensus) {
            notifier(objectToPublishable({
                submitted: normalizePlayers(consensus.submitted),
                pending: normalizePlayers(consensus.pending),
            }));
        },
        
        subscribeHandler: function (topics) {
            return getConsensus().then((consensus)=> {
                const toReturn = [];
                if (topics.indexOf('submitted') !== -1) {
                    toReturn.push({ name: 'submitted', value: normalizePlayers(consensus.submitted) });
                }
                if (topics.indexOf('pending') !== -1) {
                    toReturn.push({ name: 'pending', value: normalizePlayers(consensus.pending) });
                }
                return toReturn;
            });
        }
    };
}
