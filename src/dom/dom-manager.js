module.exports = (function () {
    'use strict';
    var config = require('../config');

    var nodeManager = require('./nodes/node-manager');
    var attrManager = require('./attributes/attribute-manager');
    var converterManager = require('../converters/converter-manager');

    var parseUtils = require('../utils/parse-utils');
    var domUtils = require('../utils/dom');

    //Jquery selector to return everything which has a f- property set
    $.expr[':'][config.prefix] = function (obj) {
        var $this = $(obj);
        var dataprops = _.keys($this.data());

        var match = _.find(dataprops, function (attr) {
            return (attr.indexOf(config.prefix) === 0);
        });

        return !!(match);
    };

    $.expr[':'].webcomponent = function (obj) {
        return obj.nodeName.indexOf('-') !== -1;
    };

    var publicAPI = {

        nodes: nodeManager,
        attributes: attrManager,
        converters: converterManager,
        //utils for testing
        private: {
            matchedElements: []
        },

        unbindElement: function (element, channel) {
            var $el = $(element);

            //FIXME: have to readd events to be able to remove them. Ugly
            var Handler = nodeManager.getHandler($el);
            var h = new Handler.handle({
                el: element
            });
            h.removeEvents();

            $(element.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                var wantedPrefix = 'data-f-';
                if (attr.indexOf(wantedPrefix) === 0) {
                    attr = attr.replace(wantedPrefix, '');

                    var handler = attrManager.getHandler(attr, $el);
                    if (handler.stopListening) {
                        handler.stopListening.call($el, attr);
                    }
                }
            });

            var subsid = $el.data('f-subscription-id');
            if (subsid) {
                channel.unsubscribe(subsid);
            }
        },

        bindElement: function (element, channel) {
            this.private.matchedElements = this.private.matchedElements.concat(element);

            //Send to node manager to handle ui changes
            var $el = $(element);
            var Handler = nodeManager.getHandler($el);
            new Handler.handle({
                el: element
            });

            var varMap = $el.data('variable-attr-map');
            if (!varMap) {
                varMap = {};
                //NOTE: looping through attributes instead of .data because .data automatically camelcases properties and make it hard to retrvieve
                $(element.attributes).each(function (index, nodeMap) {
                    var attr = nodeMap.nodeName;
                    var attrVal = nodeMap.value;

                    var wantedPrefix = 'data-f-';
                    if (attr.indexOf(wantedPrefix) === 0) {
                        attr = attr.replace(wantedPrefix, '');

                        var handler = attrManager.getHandler(attr, $el);
                        var isBindableAttr = true;
                        if (handler && handler.init) {
                            isBindableAttr = handler.init.call($el, attr, attrVal);
                        }

                        if (isBindableAttr) {
                            //Convert pipes to converter attrs
                            var withConv = _.invoke(attrVal.split('|'), 'trim');
                            if (withConv.length > 1) {
                                attrVal = withConv.shift();
                                $el.data('f-convert-' + attr, withConv);
                            }

                            var commaRegex = /,(?![^\[]*\])/;
                            if (attrVal.split(commaRegex).length > 1) {
                                //TODO
                                // triggerers = triggerers.concat(val.split(','));
                            } else {
                                varMap[attrVal] = attr;
                            }
                        }
                    }
                });
                $el.data('variable-attr-map', varMap);

                var subscribable = Object.keys(varMap);
                if (subscribable.length) {
                    var subsid = channel.subscribe(Object.keys(varMap), $el);
                    $el.data('f-subscription-id', subsid);
                }
            }
        },

        bindAll: function () {
            var $root = $(this.options.root);
            var me = this;
            //parse through dom and find everything with matching attributes
            var matchedElements = $root.find(':' + config.prefix);
            if ($root.is(':' + config.prefix)) {
                matchedElements = matchedElements.add($(this.options.root));
            }
            me.matchedElements = matchedElements;
            $.each(matchedElements, function (index, element) {
                me.bindElement.call(me, element, me.options.channel.variables);
            });
            $root.trigger('f.domready');
        },
        unbindAll: function () {
            var $root = $(this.options.root);
            var me = this;
            //parse through dom and find everything with matching attributes
            var matchedElements = $root.find(':' + config.prefix);
            if ($root.is(':' + config.prefix)) {
                matchedElements = matchedElements.add($(this.options.root));
            }
            me.matchedElements = [];
            $.each(matchedElements, function (index, element) {
                me.unbindElement.call(me, element, me.options.channel.variables);
            });
        },

        initialize: function (options) {
            var defaults = {
                root: 'body',
                channel: null
            };
            $.extend(defaults, options);

            var channel = defaults.channel;

            this.options = defaults;

            var me = this;
            var $root = $(defaults.root);
            $(function () {
                me.bindAll();

                //Attach listeners
                // Listen for changes from api and update ui
                $root.off(config.events.react).on(config.events.react, function (evt, data) {
                    // console.log(evt.target, data, "root on");
                    var $el = $(evt.target);
                    var varmap = $el.data('variable-attr-map');

                    var convertible = {};
                    $.each(data, function (variableName, value) {
                        var propertyToUpdate = varmap[variableName.trim()];
                        if (propertyToUpdate) {
                            convertible[propertyToUpdate] = value;
                        }
                    });
                    $el.trigger('f.convert', convertible);
                });

                // Listen for changes to ui and publish to api
                $root.off(config.events.trigger).on(config.events.trigger, function (evt, data) {
                    var parsedData = {}; //if not all subsequent listeners will get the modified data

                    var $el = $(evt.target);
                    var attrConverters =  domUtils.getConvertersList($el, 'bind');

                    _.each(data, function (val, key) {
                        key = key.split('|')[0].trim(); //in case the pipe formatting syntax was used
                        val = converterManager.parse(val, attrConverters);
                        parsedData[key] = parseUtils.toImplicitType(val);

                        $el.trigger('f.convert', { bind: val });
                    });

                    channel.variables.publish(parsedData);
                });

                // data = {proptoupdate: value}
                $root.off('f.convert').on('f.convert', function (evt, data) {
                    var $el = $(evt.target);
                    var convert = function (val, prop) {
                        prop = prop.toLowerCase();
                        var attrConverters =  domUtils.getConvertersList($el, prop);
                        var handler = attrManager.getHandler(prop, $el);
                        var convertedValue = converterManager.convert(val, attrConverters);
                        handler.handle.call($el, convertedValue, prop);
                    };

                    if ($.isPlainObject(data)) {
                        _.each(data, convert);
                    } else {
                        convert(data, 'bind');
                    }
                });

                $root.off('f.ui.operate').on('f.ui.operate', function (evt, data) {
                    data = $.extend(true, {}, data); //if not all subsequent listeners will get the modified data
                    _.each(data.operations, function (opn) {
                       opn.params = _.map(opn.params, function (val) {
                           return parseUtils.toImplicitType($.trim(val));
                       });
                    });
                    channel.operations.publish(data);
                });
            });
        }
    };

    return $.extend(this, publicAPI);
}());
