'use strict';
const _ = require('lodash');

var utils = {
    create: function (str) {
        var div = document.createElement('div');
        div.innerHTML = str.trim();
        return (div.childNodes.length === 1) ? div.childNodes[0] : div.childNodes;
    },
    createDummyChannel: function (options) {
        //TODO: Just replace this with the actual channel manager?
        var dummyChannel = function () {
            var i = 0;
            const subsMap = {};
            const knownData = {};

            function notifySubs(subs) {
                const knownKeys = Object.keys(knownData);
                if (subs && _.intersection(knownKeys, subs.variables).length === subs.variables.length) {
                    const dataToSend = _.pick(knownData, subs.variables);
                    subs.callback(dataToSend);
                }
            }
            return {
                publish: sinon.spy((data)=> {
                    $.extend(knownData, data);
                    Object.keys(subsMap).forEach((id)=> {
                        const subs = subsMap[id];
                        notifySubs(subs);
                    });
                    return $.Deferred().resolve(data).promise();
                }),
                subscribe: sinon.spy((variable, callback)=> {
                    const subsid = 'subsid' + (i++);
                    const subs = {
                        variables: [].concat(variable),
                        callback: callback,
                    };
                    subsMap[subsid] = subs;
                    notifySubs(subs);
                    return subsid;
                }),
                unsubscribe: sinon.spy((subsid)=> {
                    delete subsMap[subsid];
                })
            };
        };
   
        return dummyChannel();
    },

    initWithNode: function (str, domManager, channel) {
        if (!channel) {
            channel = utils.createDummyChannel();
        }
        var $node = $(utils.create(str));

        return domManager.initialize({
            root: $node,
            channel: channel
        });
        // return $node;
    },
    spyOnNode: function ($node, spy) {
        if (!spy) {
            spy = sinon.spy();
        }
        $node.on('update.f.ui', function () {
            //sinon doesn't like passing the spy directly with 'this' as context.
            spy.apply(null, arguments);
        });
        return spy;
    }
};

module.exports = utils;
