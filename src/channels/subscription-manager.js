'use strict';

var _createClass = (function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ('value' in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor); 
        } 
    }
    return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps);
        return Constructor; 
    }; 
}());

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

    _createClass(SubscriptionManager, [{
        key: 'publish',
        value: function publish(topics, data) {
            topics = [].concat(topics);
            this.subscriptions.forEach(function (subs) {
                var fn = subs.batch ? checkAndNotifyBatch : checkAndNotify;
                fn(topics, subs);
            });
        }
    }, {
        key: 'subscribe',
        value: function subscribe(topics, cb, options) {
            var subs = makeSubs(topics, cb, options);
            this.subscriptions = this.subscriptions.concat(subs);
            return subs;
        }
    }, {
        key: 'unsubscribe',
        value: function unsubscribe(token) {
            this.subscriptions = _.reject(this.subscriptions, function (subs) {
                return subs.id === token;
            });
        }
    }, {
        key: 'getSubscribedTopics',
        value: function getSubscribedTopics() {
            var list = _.uniq(_.flatten(_.map(this.subscriptions, 'topics')));
            return list;
        }
    }]);

    return SubscriptionManager;
}());

exports.default = SubscriptionManager;
