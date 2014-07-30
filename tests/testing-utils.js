'use strict';
module.exports = {
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
    }
};
