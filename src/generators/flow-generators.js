module.exports = (function() {
    'use strict';
    var config = require('../config');

    var generators = [
        require('./input-text.js')
    ];
    var channel = require('../core/flow-monitor.js');

    //Jquery selector to return everything which has a f- property set
    $.expr[':'][config.prefix] = function(obj){
        var $this = $(obj);
        var dataprops = _.keys($this.data());

        var match = _.find(dataprops, function (attr) {
            return (attr.indexOf(config.prefix) === 0);
        });

        return !!(match);
    };


    var publicAPI = {

        initialize: function(root) {
            if (!root) {
                root = 'body';
            }
            //parse through dom and find everything with matching attributes
            var matchedElements = $(root).find(':' + config.prefix);

            $.each(matchedElements, function(index, element) {
                $.each(generators, function(index, generator) {
                    if (generator.test(element) === true) {

                        generator.claim(element);
                        var modelVars = generator.getModelVariables();
                        channel.bind(modelVars, element);
                    }
                });
            });
        }
    };

    return publicAPI;

    // $.extend(this, publicAPI);
}());
