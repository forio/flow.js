'use strict';
var utils = {
    create: function (str) {
        var div = document.createElement('div');
        div.innerHTML = str;
        return div.childNodes[0];
    },
    createDummyChannel: function () {
        var dummyChannel = {
            publish: $.noop,
            subscribe: $.noop,
            unsubscribe:  $.noop
        };

        var dummyChannelManager = {
            variables: (dummyChannel),
            operations: (dummyChannel)
        };

        return dummyChannelManager;
    },

    initWithNode: function(str, domManager) {
        var $node = $(utils.create(str));
        domManager.initialize({
            root: $node,
            channel: utils.createDummyChannel()
        });
        return $node;
    },
    spyOnNode: function ($node) {
        var spy = sinon.spy();
        $node.on('update.f.ui', function(){
            //sinon doesn't like passing the spy directly with 'this' as context.
            spy.apply(null, arguments);
        });
        return spy;
    }
};

module.exports = utils;
