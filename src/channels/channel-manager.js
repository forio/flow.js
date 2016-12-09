'use strict';

var RunChannel = require('./run-channel');

module.exports = function ChannelManager(options) {

    this.run = new RunChannel(options.run, options.initFn);

    return this.run;
};
