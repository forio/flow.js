import JSONParseMiddleware from './middleware/json-parse-middleware';
import EpicenterMiddleware from './middleware/epicenter-middleware';
import DefaultChannelManager from './channel-manager';

import { interpolatable } from './channel-manager-enhancements';

//Moving  epicenter-centric glue here so channel-manager can be tested in isolation
var InterpolatableChannelManager = interpolatable(DefaultChannelManager);
export default function ChannelManager(opts) {
    var cm = new InterpolatableChannelManager($.extend(true, {}, {
        middlewares: [JSONParseMiddleware, EpicenterMiddleware]
    }, opts));
    return cm;
}
