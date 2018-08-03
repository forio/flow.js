import { groupByHandlers, groupSequentiallyByHandlers, normalizeSubscribeResponse } from './utils/handler-utils';
import { unprefix, unprefixTopics, mapWithPrefix, silencable, excludeReadOnly } from './utils';
import { makePromise } from 'utils/general';
import _ from 'lodash';


/**
 * Handle subscriptions
 * @param  {Handler[]} handlers Array of the form [{ match: function (){}, }]
 * @param  {String[]} topics   Array of strings
 * @param  {SubscribeOptions} [options]
 * @return {Promise<Publishable[]>} Returns populated topics if available
 */
export function notifySubscribeHandlers(handlers, topics, options) {
    const grouped = groupByHandlers(topics, handlers);
    const promises = [];
    grouped.filter((handler)=> handler.subscribeHandler).forEach(function (handler) {
        const mergedOptions = $.extend(true, {}, handler.options, options);
        const unprefixed = unprefixTopics(handler.data, handler.matched);
        const promise = makePromise(()=> {
            const subsResponse = handler.subscribeHandler(unprefixed, mergedOptions, handler.matched);
            return subsResponse;
        }).then((topicsWithData)=> {
            const normalized = normalizeSubscribeResponse(topicsWithData, unprefixed);
            const prefixed = mapWithPrefix(normalized, handler.matched);
            return prefixed;
        });
        promises.push(promise);
    });
    return $.when.apply(null, promises).then(function () {
        const arr = [].concat.apply([], arguments);
        return arr;
    });
}

/**
 * 
 * @param {Handler[]} handlers 
 * @param {String[]} recentlyUnsubscribedTopics
 * @param {String[]} remainingTopics 
 */
export function notifyUnsubscribeHandlers(handlers, recentlyUnsubscribedTopics, remainingTopics) {
    handlers = handlers.map(function (h, index) {
        h.unsubsKey = index;
        return h;
    });

    const unsubsGrouped = groupByHandlers(recentlyUnsubscribedTopics, handlers);
    const remainingGrouped = groupByHandlers(remainingTopics, handlers);

    unsubsGrouped.filter((h)=> h.unsubscribeHandler).forEach(function (handler) {
        const unprefixedUnsubs = unprefixTopics(handler.data, handler.matched);
        const matchingRemainingHandler = _.find(remainingGrouped, function (remainingHandler) {
            return remainingHandler.unsubsKey === handler.unsubsKey;
        });
        const matchingTopicsRemaining = matchingRemainingHandler ? matchingRemainingHandler.data : [];
        const unprefixedRemaining = unprefixTopics(matchingTopicsRemaining || [], handler.matched);
        handler.unsubscribeHandler(unprefixedUnsubs, unprefixedRemaining);
    });
}

/**
 * 
 * @param {Handler[]} handlers 
 * @param {Publishable[]} publishData 
 * @param {PublishOptions} [options]
 * @return {Promise}
 */
export function passthroughPublishInterceptors(handlers, publishData, options) {
    const grouped = groupSequentiallyByHandlers(publishData, handlers);
    let $initialProm = $.Deferred().resolve([]).promise();
    grouped.forEach(function (handler) {
        $initialProm = $initialProm.then(function (dataSoFar) {
            const mergedOptions = $.extend(true, {}, handler.options, options);
            const unprefixed = unprefix(handler.data, handler.matched);

            const publishableData = excludeReadOnly(unprefixed, mergedOptions.readOnly);
            if (!publishableData.length) {
                return dataSoFar;
            }

            const result = handler.publishHandler ? handler.publishHandler(publishableData, mergedOptions, handler.matched) : publishableData;
            const publishProm = $.Deferred().resolve(result).promise();
            return publishProm.then(function (published) {
                return silencable(published, mergedOptions.silent);
            }).then(function (published) {
                let mapped = mapWithPrefix(published, handler.matched);
                if (handler.isDefault && handler.matched) {
                    mapped = mapped.concat(published);
                }
                return mapped;
            }).then(function (mapped) {
                return [].concat(dataSoFar, mapped);
            });
        });
    });
    return $initialProm;
}

/**
 * Router
 * @param  {Handler[]} handlers
 * @param {object} [options]
 * @param {function} [notifier]
 * @return {Router}
 */
export default function router(handlers, options, notifier) {
    let myHandlers = (handlers || []).map((Handler)=> {
        let handler = Handler;
        if (_.isFunction(Handler)) {
            handler = new Handler(options, notifier);
            $.extend(this, handler.expose);
        }
        if (typeof handler.match === 'string') {
            const matchString = handler.match;
            handler.name = matchString;
            handler.match = (t)=> t === matchString ? '' : false;
        }
        return handler;
    });

    const expose = myHandlers.reduce((accum, h)=> {
        $.extend(true, accum, h.expose);
        return accum;
    }, {});

    return {
        expose: expose,
        match: (topic)=> {
            return myHandlers.reduce((match, handler)=> {
                const matched = handler.match(topic);
                if (match === false && matched !== false) {
                    return '';
                }
                return match;
            }, false);
        },

        /**
         * @param {String[]} topics
         * @param {SubscribeOptions} [options]
         * @return {Promise<Publishable[]>} Returns populated topics if available
         */
        subscribeHandler: function (topics, options) {
            return notifySubscribeHandlers(myHandlers, topics, options);
        },
        /**
         * @param {String[]} recentlyUnsubscribedTopics
         * @param {String[]} remainingTopics
         * @return {void}
         */
        unsubscribeHandler: function (recentlyUnsubscribedTopics, remainingTopics) {
            return notifyUnsubscribeHandlers(myHandlers, recentlyUnsubscribedTopics, remainingTopics);
        },

        /**
         * @param {Publishable[]} data
         * @param {PublishOptions} [options]
         * @return {Promise}
         */
        publishHandler: function (data, options) {
            return passthroughPublishInterceptors(myHandlers, data, options);
        },

        addRoute: function (handler) {
            if (!handler || !handler.match) {
                throw Error('Handler does not have a valid `match` property');
            }
            handler.id = _.uniqueId('routehandler-');
            myHandlers.unshift(handler);
            return handler.id;
        },
        removeRoute: function (routeid) {
            myHandlers = myHandlers.filter((handler)=> {
                return handler.id !== routeid;
            });
        }
    };
}
