import DefaultChannelManager from './channel-manager';

import EpicenterRoutes from './middleware/epicenter-router';
import JSONRoutes from './middleware/json-router';

import { interpolatable, withMiddleware } from './channel-manager-enhancements';

//Moving  connecting glue here so channel-manager can be tested in isolation
var InterpolatableChannelManagerWithMiddleware = interpolatable(withMiddleware(DefaultChannelManager));
export default function ChannelManager(opts) {
    var cm = new InterpolatableChannelManagerWithMiddleware($.extend(true, {}, {
        middlewares: [JSONRoutes, EpicenterRoutes]
    }, opts));
    return cm;
}
