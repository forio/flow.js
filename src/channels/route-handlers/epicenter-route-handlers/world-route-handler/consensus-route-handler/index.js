import OperationsHandler from './consensus-operations-handler';
import StatusHandler from './consensus-status-handler';
import PlayersHandler from './consensus-players-handler';
import router from 'channels/channel-router';
import { matchPrefix } from 'channels/route-handlers/route-matchers';
import { withPrefix } from 'channels/channel-router/utils';

const ConsensusManager = F.manager.ConsensusManager;

const OPERATIONS_PREFIX = 'operations:';
const PLAYERS_PREFIX = 'players:';
const STATUS_PREFIX = 'status:';

export default function ConsensusRouteHandler(config, notifier) {
    const defaults = {
        serviceOptions: {},
        channelOptions: {}
    };
    const opts = $.extend(true, {}, defaults, config);

    const cm = new ConsensusManager(opts.serviceOptions);

    function getConsensus() {
        return cm.getCurrent();
    }

    const opnHandler = OperationsHandler(getConsensus, withPrefix(notifier, OPERATIONS_PREFIX));
    const statusHandler = StatusHandler(getConsensus, withPrefix(notifier, STATUS_PREFIX));
    const playersHandler = PlayersHandler(getConsensus, withPrefix(notifier, PLAYERS_PREFIX));

    const handlers = [
        $.extend({}, opnHandler, { 
            name: 'consensus operations',
            match: matchPrefix(OPERATIONS_PREFIX),
            options: opts.channelOptions.operations,
        }),
        $.extend({}, statusHandler, { 
            name: 'consensus status',
            match: matchPrefix(STATUS_PREFIX),
            options: opts.channelOptions.status,
        }),
        $.extend({}, playersHandler, { 
            isDefault: true,
            name: 'consensus players',
            match: matchPrefix(PLAYERS_PREFIX),
            options: opts.channelOptions.players,
        }),
    ];

    var consensusRouteHandler = router(handlers, notifier);
    consensusRouteHandler.expose = { consensusManager: cm };
    
    return consensusRouteHandler;
}
