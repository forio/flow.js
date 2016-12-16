'use strict';

var RunChannel = require('./run-channel');

module.exports = function ChannelManager(options) {

    this.run = new RunChannel(options.run, options.initFn);

    return this.run;

    // var publicApi = {
    //     publish: function () {

    //     },
    //     subscribe: function () {

    //     }
    // };

    // $.extend(this, publicApi);
};
