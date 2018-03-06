// import JSONParseMiddleware from './middleware/json-parse-middleware';
import EpicenterMiddleware from './middleware/epicenter-middleware';
import DefaultChannelManager from './channel-manager';

import { interpolatable, withMiddleware } from './channel-manager-enhancements';

//Moving  epicenter-centric glue here so channel-manager can be tested in isolation
var InterpolatableChannelManagerWithMiddleware = interpolatable(withMiddleware(DefaultChannelManager));
export default function ChannelManager(opts) {
    var cm = new InterpolatableChannelManagerWithMiddleware($.extend(true, {}, {
        middlewares: [EpicenterMiddleware]
    }, opts));
    return cm;
}
