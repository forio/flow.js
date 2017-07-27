import subscribeInterpolator from './subscribe-interpolator';
import publishInterpolator from './publish-interpolator';

export default function interpolatable(channelManager) {
    var subsidMap = {};

    var boundBaseSubscribe = channelManager.subscribe.bind(channelManager);
    var boundBaseUnsubscribe = channelManager.unsubscribe.bind(channelManager);
    var boundBaseUnsubscribeAll = channelManager.unsubscribeAll.bind(channelManager);
    var boundBasePublish = channelManager.publish.bind(channelManager);

    var unsubscribe = function (token) {
        var existing = subsidMap[token];
        if (existing) {
            boundBaseUnsubscribe(existing);
        } else {
            boundBaseUnsubscribe(token);
        }
        delete subsidMap[token];
    };
    
    function oneTimeFetcher(variables, cb) {
        boundBaseSubscribe(variables, (response, meta)=> {
            boundBaseUnsubscribe(meta.id);
            cb(response);
        });
    }

    return $.extend({}, channelManager, {
        subscribe: subscribeInterpolator(boundBaseSubscribe, (interpolatedSubsId, outerSubsId)=> {
            unsubscribe(interpolatedSubsId); //invalidate any older subscriptions
            subsidMap[interpolatedSubsId] = outerSubsId;
        }),

        publish: publishInterpolator(boundBasePublish, oneTimeFetcher),
        unsubscribe: unsubscribe,
        unsubscribeAll: function () {
            boundBaseUnsubscribeAll();
            subsidMap = {};
        }
    });
}
