import DefaultChannelManager from './channel-manager';

import EpicenterRoutes from './middleware/epicenter-router';
import JSONRoutes from './middleware/json-router';

import withRouter from './channel-manager-enhancements/with-router';

import { interpolatable } from './channel-manager-enhancements';

//Moving connecting glue here so channel-manager can be tested in isolation
var InterpolatableChannelManagerWithMiddleware = interpolatable(withRouter(DefaultChannelManager));
export default function ChannelManager(opts) {
    const defaultRoutes = [JSONRoutes, EpicenterRoutes];
    const routes = opts && opts.routes ? opts.routes : [];
    var cm = new InterpolatableChannelManagerWithMiddleware($.extend(true, {}, {
        routes: [].concat(routes, defaultRoutes)
    }, opts));
    return cm;
}
