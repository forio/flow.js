import DefaultChannelManager from './channel-manager';

import { JSONRouteHandler, EpicenterRouteHandler } from './route-handlers';
import { interpolatable, routable } from './channel-manager-enhancements';

//Moving connecting glue here so channel-manager can be tested in isolation
var InterpolatableRoutableChannelManager = interpolatable(routable(DefaultChannelManager));
export default function ChannelManager(opts) {
    const defaultRouteHandlers = [JSONRouteHandler, EpicenterRouteHandler];
    const routes = opts && opts.routes ? opts.routes : [];
    var cm = new InterpolatableRoutableChannelManager($.extend(true, {}, {
        routes: [].concat(routes, defaultRouteHandlers)
    }, opts));
    return cm;
}
