'use strict';

var createClass = require('utils/create-class');

var makeSubs = function makeSubs(topics, callback, options) {
    var id = _.uniqueId('subs-');
    var defaults = {
        batch: true
    };
    return $.extend(true, {
        id: id,
        topics: topics,
        callback: callback,
        lastSent: {}
    }, defaults, options);
};

function checkAndNotifyBatch(publishedTopics, subscription, data) {
    var matchingTopics = _.intersection(publishedTopics, subscription.topics);
    if (matchingTopics.length === subscription.topics.length) {
        subscription.callback(data);
    }
    publishedTopics.forEach(function (topic) {
        subscription.lastSent[publishedTopics] = data;
    });
}

function checkAndNotify(publishedTopics, subscription, data) {
    publishedTopics.forEach(function (topic) {
        if (_.includes(subscription.topics, topic) && !_.isEqual(subscription.lastSent[topic], data)) {
            subscription.lastSent[topic] = data;
            subscription.callback(data);
        }
    });
}

var SubscriptionManager = (function () {
    function SubscriptionManager() {
        this.subscriptions = [];
    }

    createClass(SubscriptionManager, {
        publish: function publish(topics, data) {
            topics = [].concat(topics);
            this.subscriptions.forEach(function (subs) {
                var fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
                fn(topics, subs);
            });
        },
        subscribe: function subscribe(topics, cb, options) {
            var subs = makeSubs(topics, cb, options);
            this.subscriptions = this.subscriptions.concat(subs);
            return subs;
        },
        unsubscribe: function unsubscribe(token) {
            this.subscriptions = _.reject(this.subscriptions, function (subs) {
                return subs.id === token;
            });
        },
        getSubscribedTopics: function getSubscribedTopics() {
            var list = _.uniq(_.flatten(_.map(this.subscriptions, 'topics')));
            return list;
        }
    });

    return SubscriptionManager;
}());

module.exports = SubscriptionManager;
