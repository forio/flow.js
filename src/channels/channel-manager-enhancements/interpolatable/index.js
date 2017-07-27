// import { normalizeParamOptions } from './channel-utils';

import subscribeInterpolator from './subscribe-interpolator';

export default function interpolatable(channelManager) {
    var subsidMap = {};

    var boundBaseSubscribe = channelManager.subscribe.bind(channelManager);
    var boundBaseUnsubscribe = channelManager.unsubscribe.bind(channelManager);

    var unsubscribe = function (token) {
        var existing = subsidMap[token];
        if (existing) {
            boundBaseUnsubscribe(existing);
        } else {
            boundBaseUnsubscribe(token);
        }
        delete subsidMap[token];

    };

    var publishFn = channelManager.publish.bind(channelManager);

    return $.extend({}, channelManager, {
        subscribe: subscribeInterpolator(boundBaseSubscribe, (interpolatedSubsId, outerSubsId)=> {
            unsubscribe(interpolatedSubsId); //invalidate any older subscriptions
            subsidMap[interpolatedSubsId] = outerSubsId;
        }),

        publish: function (topic, value, options) {
            // var normalized = normalizeParamOptions(topic, value, options);
            
            return channelManager.publish.apply(channelManager, arguments);
        },

        unsubscribe: unsubscribe
    });
}
