export default function ConsensusPlayersHandler(getCurrent, notifier) {
    function normalizePlayers(rolePlayerMap) {
        return Object.keys(rolePlayerMap).reduce((accum, role)=> {
            const playersForRole = rolePlayerMap[role];
            const playersWithRole = playersForRole.map((p)=> {
                return Object.assign({}, p, {
                    role: role
                });
            });
            accum = accum.concat(playersWithRole);
            return accum;
        }, []);
    }
    return {
        subscribeHandler: function (topics) {
            return getCurrent().then((consensus)=> {
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
