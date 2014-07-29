module.exports = (function() {
    'use strict';
    var config = require('../config');

    var nodeManager = require('./nodes/node-manager.js');
    var attrManager = require('./attributes/attribute-manager.js');

    //Jquery selector to return everything which has a f- property set
    $.expr[':'][config.prefix] = function(obj){
        var $this = $(obj);
        var dataprops = _.keys($this.data());

        var match = _.find(dataprops, function (attr) {
            return (attr.indexOf(config.prefix) === 0);
        });

        return !!(match);
    };

    $.expr[':'].webcomponent = function(obj){
        console.log(obj);
        return obj.nodeName.indexOf('-') !== -1;
    };

    var publicAPI = {

        nodes: nodeManager,
        attributes: attrManager,

        //utils for testing
        private: {

        },

        initialize: function(options) {
            var defaults = {
                root: 'body',
                channel: null
            };
            $.extend(defaults, options);

            var channel = defaults.channel;
            var me = this;

            var $root = $(defaults.root);
            $(function(){
                //parse through dom and find everything with matching attributes
                var matchedElements = $root.find(':' + config.prefix);
                if ($root.is(':' + config.prefix)) {
                    matchedElements = matchedElements.add($(defaults.root));
                }

                me.private.matchedElements = matchedElements;

                $.each(matchedElements, function(index, element) {
                    var $el = $(element);
                    $.each(nodeManager.list, function(index, Node) {
                        if ($el.is(Node.selector)) {
                            new Node({
                                el: element
                            });

                            var varMap = $el.data('variable-attr-map');
                            if (!varMap) {
                                varMap = {};
                                //NOTE: looping through attributes instead of .data because .data automatically camelcases properties and make it hard to retrvieve
                                $(element.attributes).each(function(index, nodeMap){
                                    var attr = nodeMap.nodeName;
                                    var attrVal = nodeMap.nodeValue;

                                    var wantedPrefix = 'data-f-';
                                    if (attr.indexOf(wantedPrefix) === 0) {
                                        attr = attr.replace(wantedPrefix, '');

                                        var handler = attrManager.getHandler($el, attr);
                                        var isBindableAttr = true;
                                        if (handler && handler.init) {
                                            isBindableAttr = handler.init.call($el, attr, attrVal);
                                        }

                                        if (isBindableAttr) {
                                            var commaRegex = /,(?![^\[]*\])/;
                                            if (attrVal.split(commaRegex).length > 1) {
                                                //TODO
                                                // triggerers = triggerers.concat(val.split(','));
                                            }
                                            else {
                                                varMap[attrVal] = attr;
                                            }
                                        }
                                    }
                                });
                                $el.data('variable-attr-map', varMap);
                            }

                            // console.log(view, node.selector);
                            var subscribable = Object.keys(varMap);
                            if (subscribable.length) {
                                channel.variables.subscribe(Object.keys(varMap), $el);
                            }

                            return false; //break loop
                        }
                    });
                });

                //Attach listeners
                $root.on(config.events.react, function(evt, data) {
                    // console.log(evt.target, data, "root on");
                    var $el = $(evt.target);
                    var varmap = $el.data('variable-attr-map');
                    $.each(data, function(variableName, value) {
                        //TODO: this could be an array
                        var propertyToUpdate = varmap[variableName].toLowerCase();
                        var handler = attrManager.getHandler($el, propertyToUpdate);
                        handler.handle.call($el, value, propertyToUpdate);
                    });
                });

                $root.on(config.events.trigger, function(evt, data) {
                    channel.variables.publish(data);
                });

                $root.on('f.ui.operate', function(evt, data) {
                    channel.operations.publish(data.fn, data.args);
                });
            });
        }
    };


    return publicAPI;
}());
