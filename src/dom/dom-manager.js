module.exports = (function() {
    'use strict';
    var config = require('../config');

    var nodeManager = require('./nodes/node-manager.js');
    var attrManager = require('./attributes/attribute-manager.js');
    var converterManager = require('../converters/converter-manager.js');

    var parseUtils = require('../utils/parse-utils');

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
        return obj.nodeName.indexOf('-') !== -1;
    };

    var publicAPI = {

        nodes: nodeManager,
        attributes: attrManager,
        converters: converterManager,
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
                    var Handler = nodeManager.getHandler($el);
                    new Handler.handle({
                        el: element
                    });


                    var varMap = $el.data('variable-attr-map');
                    if (!varMap) {
                        varMap = {};
                        //NOTE: looping through attributes instead of .data because .data automatically camelcases properties and make it hard to retrvieve
                        $(element.attributes).each(function(index, nodeMap){
                            var attr = nodeMap.nodeName;
                            var attrVal = nodeMap.value;

                            var wantedPrefix = 'data-f-';
                            if (attr.indexOf(wantedPrefix) === 0) {
                                attr = attr.replace(wantedPrefix, '');

                                var withConv = _.invoke(attrVal.split('|'), 'trim');
                                if (withConv.length > 1) {
                                    attrVal = withConv.shift();
                                    $el.data('f-converters-' + attr, withConv);
                                }

                                var handler = attrManager.getHandler(attr, $el);
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

                    var subscribable = Object.keys(varMap);
                    if (subscribable.length) {
                        channel.variables.subscribe(Object.keys(varMap), $el);
                    }
                });

                //Attach listeners
                //TODO: split initialize into multiple sub events, at least Add & then attach handlers
                $root.off(config.events.react).on(config.events.react, function(evt, data) {
                    // console.log(evt.target, data, "root on");
                    var $el = $(evt.target);
                    var varmap = $el.data('variable-attr-map');

                    $.each(data, function(variableName, value) {
                        var propertyToUpdate = varmap[variableName.trim()];
                        if (propertyToUpdate){
                            //f-converters-* is already set while parsing the varmap, as an array to boot
                            var attrConverters = $el.data('f-converters-' + propertyToUpdate);

                            if (!attrConverters && propertyToUpdate === 'bind') {
                                attrConverters = $el.data('f-convert');
                                if (!attrConverters) {
                                    var $parentEl = $el.closest('[data-f-convert]');
                                    if ($parentEl) {
                                        attrConverters = $parentEl.data('f-convert');
                                    }
                                }

                                if (attrConverters) {
                                    attrConverters = attrConverters.split('|');
                                }
                            }
                            var convertedValue = converterManager.convert(value, attrConverters);

                            propertyToUpdate = propertyToUpdate.toLowerCase();
                            var handler = attrManager.getHandler(propertyToUpdate, $el);
                            handler.handle.call($el, convertedValue, propertyToUpdate);
                        }
                    });
                });

                $root.off(config.events.trigger).on(config.events.trigger, function(evt, data) {
                    var parsedData = {}; //if not all subsequent listeners will get the modified data

                    var $el = $(evt.target);

                    //f-converters-* is already set while parsing the varmap, as an array to boot
                    var attrConverters = $el.data('f-converters-bind');
                    if (!attrConverters) {
                        attrConverters = $el.data('f-convert');
                        if (!attrConverters) {
                            var $parentEl = $el.closest('[data-f-convert]');
                            if ($parentEl) {
                                attrConverters = $parentEl.data('f-convert');
                            }
                        }
                        if (attrConverters) {
                            attrConverters = attrConverters.split('|');
                        }
                    }

                    _.each(data, function (val, key) {
                        key = key.split('|')[0].trim(); //in case the pipe formatting syntax was used
                        val = converterManager.parse(val, attrConverters);
                        parsedData[key] = parseUtils.toImplicitType(val);
                    });
                    channel.variables.publish(parsedData);
                });

                $root.off('f.ui.operate').on('f.ui.operate', function(evt, data) {
                    data = $.extend(true, {}, data); //if not all subsequent listeners will get the modified data
                    data.args = _.map(data.args, function (val) {
                        return parseUtils.toImplicitType($.trim(val));
                    });
                    channel.operations.publish(data.fn, data.args);
                });
            });
        }
    };


    return $.extend(this, publicAPI);
}());
