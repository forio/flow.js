'use strict';

var RunChannel = require('./run-channel');

module.exports = function ChannelManager(options) {

    var initFn = options.initFn;

    var opnSilent = options.run.operations.silent;
    var isInitOperationSilent = initFn && (opnSilent === true || (_.isArray(opnSilent) && _.contains(opnSilent, initFn)));
    var preFetchVariables = !initFn || isInitOperationSilent;

    if (preFetchVariables) {
        options.run.variables.autoFetch.start = true;
    }
    
    this.run = new RunChannel(options.run);

    return this.run;
};
