// import { normalizeParamOptions } from './channel-utils';

import subscribeInterpolator from './subscribe-interceptor';

export default function interpolatable(channelManager) {
    var subscribeFn = channelManager.subscribe.bind(channelManager);
    var unsubscribeFn = channelManager.unsubscribe.bind(channelManager);
    var publishFn = channelManager.publish.bind(channelManager);
    return {
        subscribe: subscribeInterpolator(subscribeFn),

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
