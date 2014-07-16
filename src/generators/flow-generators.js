module.exports = (function() {
    'use strict';
    var config = require('../config');
    var utils = require('../utils/dom');

    var generators = [
        require('./input-text-view'),
        require('./input-checkbox-view'),
        require('./dom-element-view')
    ];

    var FC = require('../channels/channel-manager.js');
    var channel = new FC({account: 'nranjit', project: 'sales_forecaster'});


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

        channel: channel,

        initialize: function(root) {
            $(function(){
                if (!root) {
                    root = '*';
                }
                //parse through dom and find everything with matching attributes
                var matchedElements = $(root).find(':' + config.prefix);

                $.each(matchedElements, function(index, element) {
                    var $el = $(element);
                    $.each(generators, function(index, generator) {
                        if ($(element).is(generator.selector)) {
                            var view = new generator.handler({
                                el: element,
                                channel: channel
                            });

                            var varMap = $el.data('variable-attr-map');
                            if (!varMap) {
                                varMap = utils.generateVariableAttrMap(element);
                                $el.data('variable-attr-map', varMap);
                            }

                            // console.log(view, generator.selector);
                            channel.variables.subscribe(Object.keys(varMap), $el);
                            return false; //break loop
                        }
                    });
                });
            });
        }
    };

    return publicAPI;

    // $.extend(this, publicAPI);
}());
