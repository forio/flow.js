module.exports = (function() {
    'use strict';
    var config = require('../config');
    var utils = require('../utils/dom');

    var nodeManager = require('../dom/node-manager.js');

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

        nodes: nodeManager,

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
                    $.each(nodeManager.list, function(index, generator) {
                        if ($el.is(generator.selector)) {
                            var view = new generator.handler({
                                el: element
                            });

                            var varMap = $el.data('variable-attr-map');
                            if (!varMap) {
                                varMap = utils.generateVariableAttrMap(element);
                                $el.data('variable-attr-map', varMap);
                            }

                            // console.log(view, generator.selector);
                            channel.variables.subscribe(Object.keys(varMap), $el);

                            // view.propertyChangeHandlers = view.propertyChangeHandlers.concat(defaultAttrHandlers);

                            $el.on(config.events.react, function(evt, data) {
                                var varmap = $(this).data('variable-attr-map');
                                $.each(data, function(variableName, value) {
                                    //TODO: this could be an array
                                    var propertyToUpdate = varmap[variableName].toLowerCase();
                                    $.each(view.propertyChangeHandlers, function(index, handler) {
                                        var nodeTest = (!handler.target) || $el.is(handler.target);
                                        var attrTest = utils.match(handler.test, propertyToUpdate, $el);
                                        if (nodeTest && attrTest) {
                                            handler.handle.call($el, propertyToUpdate, value);
                                            return false;
                                        }
                                    });
                                });
                            });

                            $el.on(config.events.trigger, function(evt, data) {
                                channel.variables.publish(data);
                            });
                            //Attach event to publish to channel

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
