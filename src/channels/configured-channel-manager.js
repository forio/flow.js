import EpicenterMiddleware from './middleware/epicenter-middleware';
import DefaultChannelManager from './channel-manager';

//Moving  epicenter-centric glue here so channel-manager can be tested in isolation
export default function ChannelManager(opts) {
    return new DefaultChannelManager($.extend(true, {}, {
        middlewares: [EpicenterMiddleware]
    }, opts));
}
