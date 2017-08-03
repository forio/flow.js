import MiddlewareManager from './middleware-manager';
import { normalizeParamOptions } from '../../channel-utils';

function getTopicsFromSubsList(subcriptionList) {
    return subcriptionList.reduce(function (accum, subs) {
        accum = accum.concat(subs.topics);
        return accum;
    }, []);
}

/**
 * Decorates passed channel manager with middleware functionality
 * @param  {ChannelManager} ChannelManager
 * @return {ChannelManager}                wrapped channel manager
 */
export default function interpolatable(ChannelManager) {
    /**
     * @implements {ChannelManager}
     */
    return class ChannelWithMiddleware extends ChannelManager {
        constructor(options) {
            super(options);
            var defaults = {
                middlewares: []
            };
            var opts = $.extend(true, {}, defaults, options);
            this.middlewares = new MiddlewareManager(opts, this.notify.bind(this), this);
        }

        publish(topic, value, options) {
            var normalized = normalizeParamOptions(topic, value, options);
            var prom = $.Deferred().resolve(normalized.params).promise();
            var lastAvailableData = normalized.params;
            var middlewares = this.middlewares.filter('publish');
            middlewares.forEach(function (middleware) {
                prom = prom.then(function (publishResponse) {
                    return middleware(publishResponse, normalized.options);
                }).then(function (response) {
                    lastAvailableData = response || lastAvailableData;
                    return lastAvailableData;
                });
            });
            prom = prom.then((published)=> {
                return super.publish(published, normalized.options);
            });
            return prom;
        }
        subscribe(topics, cb, options) {
            var subscribeMiddlewares = this.middlewares.filter('subscribe');
            var toSend = [].concat(topics);
            subscribeMiddlewares.forEach(function (middleware) {
                toSend = middleware(toSend, options) || toSend;
            });
            return super.subscribe(topics, cb, options);
        }
        unsubscribe(token) {
            var currentTopics = getTopicsFromSubsList(this.subscriptions);
            super.unsubscribe(token);
            var remainingTopics = getTopicsFromSubsList(this.subscriptions);

            var unsubscribedTopics = _.difference(currentTopics, remainingTopics);
            var middlewares = this.middlewares.filter('unsubscribe');
            middlewares.forEach(function (middleware) {
                return middleware(unsubscribedTopics, remainingTopics);
            });
        }
        unsubscribeAll() {
            var currentlySubscribed = this.getSubscribedTopics();
            var middlewares = this.middlewares.filter('unsubscribe');
            middlewares.forEach((middleware)=> middleware(currentlySubscribed, []));

            super.unsubscribeAll();
        }
    };
}
