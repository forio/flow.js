// import { normalizeParamOptions } from './channel-utils';

import subscribeInterpolator from './subscribe-interpolator';

export default function interpolatable(channelManager) {
    var subsidMap = {};

    var boundBaseSubs = channelManager.subscribe.bind(channelManager);
    var interpolatedSubscribe = subscribeInterpolator(boundBaseSubs, (interpolatedSubsId, outerSubsId)=> {
        subsidMap[interpolatedSubsId] = outerSubsId;
    });

    var unsubscribeFn = channelManager.unsubscribe.bind(channelManager);
    var publishFn = channelManager.publish.bind(channelManager);
    return {
        subscribe: interpolatedSubscribe,

        notify: channelManager.notify.bind(channelManager),

        publish: function (topic, value, options) {
            // var normalized = normalizeParamOptions(topic, value, options);
            
            return channelManager.publish.apply(channelManager, arguments);
        },

        unsubscribe: ()=> {
            //check if it's an interpolated subsid. 
            // if yes, get the underlying subsid and unsubscribe
        },

    };
}
