'use strict';
var utils = {
    create: function (str) {
        var div = document.createElement('div');
        div.innerHTML = str;
        return (div.childNodes.length === 1) ? div.childNodes[0] : div.childNodes;
    },
    createDummyChannel: function () {
        var publishSpy = sinon.spy(function () {
            return $.Deferred().resolve().promise();
        });
        var dummyChannel = function () {
            var i = 0;
            return {
                publish: publishSpy,
                subscribe: sinon.spy(()=> 'subsid' + (i++)),
                unsubscribe: sinon.spy()
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
