var EpicenterMiddleware = require('./middleware/epicenter-middleware');
var ChannelManager = require('./channel-manager');

//Moving  epicenter-centric glue here so channel-manager can be tested in isolation
module.exports = function (opts) {
    return new ChannelManager($.extend(true, {}, {
        middlewares: [EpicenterMiddleware]
    }, opts));
};
