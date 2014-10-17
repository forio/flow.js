'use strict';

var VarsChannel = require('./variables-channel');
var OperationsChannel = require('./operations-channel');

module.exports = function(config) {
    if (!config) {
        config = {};
    }

    var rm = new F.manager.RunManager(config);
    var rs = rm.run;

    var $creationPromise = rm.getRun();
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
        if ($.isFunction(value) && name !== 'variables'  && name !== 'create') {
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
    this.variables = new VarsChannel({run: rs, vent: this});
    this.operations = new OperationsChannel({run: rs, vent: this});
};
