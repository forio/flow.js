'use strict';

var createClass = require('utils/create-class');

var makeSubs = function makeSubs(topics, callback, options) {
    var id = _.uniqueId('subs-');
    var defaults = {
        batch: false
    };
    var opts = $.extend({}, defaults, options);
    return $.extend(true, {
        id: id,
        topics: topics,
        callback: callback,
    }, opts);
};

function checkAndNotifyBatch(publishObj, subscription) {
    var publishedTopics = Object.keys(publishObj);

    var matchingTopics = _.intersection(publishedTopics, subscription.topics);
    if (matchingTopics.length === subscription.topics.length) {
        var toSend = subscription.topics.reduce(function (accum, topic) {
            accum[topic] = publishObj[topic];
            return accum;
        }, {});
        subscription.callback(toSend);
    }
}

function checkAndNotify(publishObj, subscription) {
    var publishedTopics = Object.keys(publishObj);
    publishedTopics.forEach(function (topic) {
        var data = publishObj[topic];
        if (_.contains(subscription.topics, topic)) {
            var toSend = {};
            toSend[topic] = data;
            subscription.callback(toSend);
        }
    });
}

var SubscriptionManager = (function () {
    function SubscriptionManager(options) {
        var defaults = {
            subscriptions: [],
            publishMiddlewares: []
        };
        var opts = $.extend(true, {}, defaults, options);
        $.extend(this, opts);
    }

    createClass(SubscriptionManager, {
        publish: function (topic, value, options) {
            // console.log('publish', arguments);
            var attrs;
            if ($.isPlainObject(topic)) {
                attrs = topic;
                options = value;
            } else {
                (attrs = {})[topic] = value;
            }
            
            var $d = $.Deferred();
            var prom = $d.resolve(attrs).promise();
            this.publishMiddlewares.forEach(function (middleware) {
                prom = prom.then(middleware);
            });
            prom.then(function (val) {
                this.subscriptions.forEach(function (subs) {
                    var fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
                    fn(val, subs);
                });
            }.bind(this));

            return prom;
        },
        subscribe: function (topics, cb, options) {
            var subs = makeSubs(topics, cb, options);
            this.subscriptions = this.subscriptions.concat(subs);
            return subs.id;
        },
        unsubscribe: function (token) {
            var oldLength = this.subscriptions.length;
            this.subscriptions = _.reject(this.subscriptions, function (subs) {
                return subs.id === token;
            });
            if (oldLength === this.subscriptions.length) {
                throw new Error('No subscription found for token ' + token);
            }
        },
        unsubscribeAll: function () {
            this.subscriptions = [];
        },
        getSubscribedTopics: function () {
            var list = _.uniq(_.flatten(_.map(this.subscriptions, 'topics')));
            return list;
        },
        getSubscribers: function (topic) {
            if (topic) {
                return _.filter(this.subscriptions, function (subs) {
                    return _.contains(subs.topics, topic);
                });
            }
            return this.subscriptions;
        }
    });

    return SubscriptionManager;
}());

module.exports = SubscriptionManager;
