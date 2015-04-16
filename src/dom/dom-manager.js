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

    var getMatchingElements = function (root) {
        var $root = $(root);
        var matchedElements = $root.find(':' + config.prefix);
        if ($root.is(':' + config.prefix)) {
            matchedElements = matchedElements.add($root);
        }
        return matchedElements;
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
            this.private.matchedElements = _.without(this.private.matchedElements, element);

            if (!channel) {
                channel = this.options.channel.variables;
            }

            var $el = $(element);
            //FIXME: have to readd events to be able to remove them. Ugly
            var Handler = nodeManager.getHandler($el);
            var h = new Handler.handle({
                el: element
            });
            if (h.removeEvents) {
                h.removeEvents();
            }

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

            var subsid = $el.data('f-subscription-id') || [];
            _.each(subsid, function (subs) {
                channel.unsubscribe(subs);
            });
        },

        bindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel.variables;
            }
            if (!_.contains(this.private.matchedElements, element)) {
                this.private.matchedElements.push(element);
            }

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
                                var varsToBind = attrVal.split(commaRegex);

                                var subsid = channel.subscribe(varsToBind, $el, { batch: true });
                                var newsubs = ($el.data('f-subscription-id') || []).concat(subsid);
                                $el.data('f-subscription-id', newsubs);

                                _.each(varsToBind, function (variable) {
                                    varMap[variable] = attr;
                                });
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
                    var newsubs = ($el.data('f-subscription-id') || []).concat(subsid);
                    $el.data('f-subscription-id', newsubs);
                }
            }
        },

        /**
         * Bind all provided elements
         * @param  {Array|jQuerySelector} elementsToBind (Optional) If not provided uses the default root provided at initialization
         */
        bindAll: function (elementsToBind) {
            if (!elementsToBind) {
                elementsToBind = getMatchingElements(this.options.root);
            } else if (!_.isArray(elementsToBind)) {
                elementsToBind = getMatchingElements(elementsToBind);
            }

            var me = this;
            //parse through dom and find everything with matching attributes
            $.each(elementsToBind, function (index, element) {
                me.bindElement.call(me, element, me.options.channel.variables);
            });
        },
        /**
         * Unbind provided elements
         * @param  {Array} elementsToUnbind (Optional). If not provided unbinds everything
         */
        unbindAll: function (elementsToUnbind) {
            var me = this;
            if (!elementsToUnbind) {
                elementsToUnbind = this.private.matchedElements;
            }
            $.each(elementsToUnbind, function (index, element) {
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
                $root.trigger('f.domready');

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
