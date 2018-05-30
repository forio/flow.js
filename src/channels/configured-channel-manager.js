import DefaultChannelManager from './channel-manager';

import router from 'channels/channel-router';
import { JSONRouteHandler, EpicenterRouteHandler } from './route-handlers';
import { interpolatable, routable } from './channel-manager-enhancements';

//Moving connecting glue here so channel-manager can be tested in isolation
const InterpolatableRoutableChannelManager = interpolatable(routable(DefaultChannelManager, router));
export default function ChannelManager(opts) {
    const defaultRouteHandlers = [JSONRouteHandler, EpicenterRouteHandler];
    const routes = opts && opts.routes ? opts.routes : [];
    const cm = new InterpolatableRoutableChannelManager($.extend(true, {}, {
        routes: [].concat(routes, defaultRouteHandlers)
    }, opts));
    return cm;
}
