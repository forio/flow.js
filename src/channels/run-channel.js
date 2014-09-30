'use strict';

var VarsChannel = require('./variables-channel');
var OperationsChannel = require('./operations-channel');

module.exports = function(config) {
    if (!config) {
        config = {
            run: {}
        };
    }

    var runparams = config.run;

    var rs = new F.service.Run(runparams);

    window.run = rs;
    //TODO: store runid in token etc. But if you do this, make sure you remove token on reset
    var $creationPromise = rs.create(config.model);
    rs.currentPromise = $creationPromise;

    var createAndThen = function(value, context) {
        return _.wrap(value, function(func) {
            var passedInParams = _.toArray(arguments).slice(1);
            return rs.currentPromise.then(function (){
                rs.currentPromise = func.apply(context, passedInParams);
                return rs.currentPromise;
            });
        });
    };

    //Make sure nothing happens before the run is created
    _.each(rs, function(value, name) {
        if ($.isFunction(value) && name !== 'variables') {
            rs[name] = createAndThen(value, rs);
        }
    });
    var vs = rs.variables();
    _.each(vs, function(value, name) {
        if ($.isFunction(value)) {
            vs[name] = createAndThen(value, vs);
        }
    });

    this.run = rs;
    this.variables = new VarsChannel($.extend(true, {}, runparams.variables, {run: rs, vent: this}));
    this.operations = new OperationsChannel($.extend(true, {}, runparams.operations, {run: rs, vent: this}));
};
