import OperationsHandler from './consensus-operations-handler';
import StatusHandler from './consensus-status-handler';
import router from 'channels/channel-router';
import { matchPrefix } from 'channels/route-handlers/route-matchers';
import { withPrefix } from 'channels/channel-router/utils';

const ConsensusManager = F.manager.ConsensusManager;

const OPERATIONS_PREFIX = 'operations:';

export default function ConsensusRouteHandler(config, notifier) {
    const options = $.extend(true, {
        serviceOptions: {},
        channelOptions: {},
    }, config);

    const { getWorld, getSession, getChannel } = options.serviceOptions;

    const cm = new ConsensusManager();

    let consensusProm = null;
    function getConsensus(force) {
        if (!consensusProm || force) {
            consensusProm = cm.getCurrent();
        }
        return consensusProm;
    }

    const handlerOptions = {
        serviceOptions: {
            getConsensus: getConsensus,
            getSession: getSession
        },
        channelOptions: {}
    };

    const opnHandler = OperationsHandler(handlerOptions, withPrefix(notifier, OPERATIONS_PREFIX));
    const statusHandler = StatusHandler(handlerOptions, notifier);

    const handlers = [
        $.extend({}, opnHandler, { 
            name: 'consensus operations',
            match: matchPrefix(OPERATIONS_PREFIX),
            options: handlerOptions.channelOptions.operations,
        }),
        $.extend({}, statusHandler, { 
            name: 'consensus status',
            match: matchPrefix(''),
            isDefault: true,
            options: handlerOptions.channelOptions.status,
        }),
    ];

    getWorld().then((world)=> {
        const channel = getChannel(world.id);
        channel.subscribe(channel.TOPICS.RUN_RESET, ()=> {
            getConsensus(true).then((consensus)=> {
                statusHandler.notify(consensus);
            });
        });
        // FIXME: Filter by stage here
        channel.subscribe(channel.TOPICS.CONSENSUS_UPDATE, (consensus)=> {
            const isComplete = consensus.closed;
            if (isComplete) {
                getConsensus(true).then((consensus)=> {
                    statusHandler.notify(consensus);
                });
            } else {
                statusHandler.notify(consensus);
            }
        });
    });

    var consensusRouteHandler = router(handlers, notifier);
    consensusRouteHandler.expose = { consensusManager: cm };
    
    return consensusRouteHandler;
}
