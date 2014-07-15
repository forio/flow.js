'use strict';

var VarChannel = require('./variable-channel');

module.exports = function(config) {
    if (!config) {
        config = {};
    }

    var runparams = config;

    var rs = new F.service.Run(runparams);

    //TODO: store runid in token etc
    var $creationPromise = rs.create({model: 'pdasim.vmf'});

    //Make sure nothing happens before the run is created
    _.each(rs, function(value, name) {
        if ($.isFunction(value) && name !== 'variables') {
            rs[name] = _.wrap(value, function(func) {
                var passedInParams = _.toArray(arguments).slice(1);
                return $creationPromise.done(function (){
                    return func.apply(rs, passedInParams);
                });
            });
        }
    });

    var vs = rs.variables();
    _.each(vs, function(value, name) {
        if ($.isFunction(value)) {
            vs[name] = _.wrap(value, function(func) {
                var passedInParams = _.toArray(arguments).slice(1);
                return $creationPromise.done(function (){
                    return func.apply(vs, passedInParams);
                });
            });
        }
    });


    this.run = rs;
    this.variable = new VarChannel({variables: vs});
};
