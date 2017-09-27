/**
 * ## DOM Manager
 *
 * The Flow.js DOM Manager provides two-way data bindings from your project's user interface to the channel. The DOM Manager is the 'glue' through which HTML DOM elements -- including the attributes and attribute handlers provided by Flow.js for [variables](../../attributes-overview/), [operations](../../operations-overview/) and [conversion](../../converter-overview/), and those [you create](./attributes/attribute-manager/) -- are bound to the variable and operations [channels](../../channel-overview/) to link them with your project's model. See the [Epicenter architecture details](../../../creating_your_interface/arch_details/) for a visual description of how the DOM Manager relates to the [rest of the Epicenter stack](../../../creating_your_interface/).
 *
 * The DOM Manager is an integral part of the Flow.js architecture but, in keeping with our general philosophy of extensibility and configurability, it is also replaceable. For instance, if you want to manage your DOM state with [Backbone Views](http://backbonejs.org) or [Angular.js](https://angularjs.org), while still using the channels to handle the communication with your model, this is the piece you'd replace. [Contact us](http://forio.com/about/contact/) if you are interested in extending Flow.js in this way -- we'll be happy to talk about it in more detail.
 *
 */
'use strict';

const _ = require('lodash');
const { isArray, includes, pick, without } = require('lodash');

module.exports = (function () {
    var config = require('../config');
    var parseUtils = require('utils/parse-utils');
    var domUtils = require('utils/dom');

    var converterManager = require('converters/converter-manager');
    var nodeManager = require('./nodes/node-manager');
    var attrManager = require('./attributes/attribute-manager');
    var autoUpdatePlugin = require('./plugins/auto-update-bindings');

    //Jquery selector to return everything which has a f- property set
    $.expr.pseudos[config.prefix] = function (el) {
        if (!el || !el.attributes) {
            return false;
        }
        for (var i = 0; i < el.attributes.length; i++) {
            var attr = el.attributes[i].nodeName;
            if (attr.indexOf('data-' + config.prefix) === 0) {
                return true;
            }
        }
        return false;
    };

    $.expr.pseudos.webcomponent = function (obj) {
        return obj.nodeName.indexOf('-') !== -1;
    };

    /**
     * @param {JQuery<HTMLElement>} root
     * @return {JQuery<HTMLElement>}
     */ 
    var getMatchingElements = function (root) {
        var $root = $(root);
        var matchedElements = $root.find(':' + config.prefix);
        if ($root.is(':' + config.prefix)) {
            matchedElements = matchedElements.add($root);
        }
        return matchedElements;
    };

    /**
     * @param {JQuery<HTMLElement> | HTMLElement} element
     * @param {*} [context]
     * @return {HTMLElement}
     */ 
    function getElementOrError(element, context) {
        var el = (element instanceof $) ? element.get(0) : element;
        if (!el || !el.nodeName) {
            console.error(context, 'Expected to get DOM Element, got ', element);
            throw new Error(context + ': Expected to get DOM Element, got' + (typeof element));
        }
        return el;
    }

    var publicAPI = {

        nodes: nodeManager,
        attributes: attrManager,
        converters: converterManager,
        //utils for testing
        private: {
            matchedElements: []
        },

        /**
         * Unbind the element; unsubscribe from all updates on the relevant channels.
         *
         * @param {JQuery<HTMLElement>} element The element to remove from the data binding.
         * @param {ChannelInstance} channel (Optional) The channel from which to unsubscribe. Defaults to the [variables channel](../channels/variables-channel/).
         * @returns {void}
         */
        unbindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel;
            }
            const domEl = getElementOrError(element);
            var $el = $(element);
            if (!$el.is(':' + config.prefix)) {
                return;
            }
            this.private.matchedElements = without(this.private.matchedElements, element);

            //FIXME: have to readd events to be able to remove them. Ugly
            var Handler = nodeManager.getHandler($el);
            var h = new Handler.handle({
                el: domEl
            });
            if (h.removeEvents) {
                h.removeEvents();
            }

            $(domEl.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                var wantedPrefix = 'data-f-';
                if (attr.indexOf(wantedPrefix) === 0) {
                    attr = attr.replace(wantedPrefix, '');
                    var handler = attrManager.getHandler(attr, $el);
                    if (handler.unbind) {
                        handler.unbind.call($el, attr);
                    }
                }
            });

            var subsid = $el.data(config.attrs.subscriptionId) || [];
            [].concat(subsid).forEach(function (subs) {
                channel.unsubscribe(subs);
            });

            $el.removeAttr(`data-${config.attrs.subscriptionId}`).removeData(config.attrs.subscriptionId);

            _.each($el.data(), function (val, key) {
                if (key.indexOf('f-') === 0 || key.match(/^f[A-Z]/)) {
                    $el.removeData(key);
                    // var hyphenated = key.replace(/([A-Z])/g, '-$1').toLowerCase();
                    // $el.removeData(hyphenated);
                }
            });

            return this;
        },

        /**
         * Bind the element: subscribe from updates on the relevant channels.
         *
         * @param {JQuery<HTMLElement>} element The element to add to the data binding.
         * @param {ChannelInstance} channel (Optional) The channel to subscribe to. Defaults to the [run channel](../channels/run-channel/).
         * @returns {void}
         */
        bindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel;
            }
            const domEl = getElementOrError(element);
            var $el = $(domEl);
            if (!$el.is(':' + config.prefix)) {
                return;
            }
            if (!includes(this.private.matchedElements, domEl)) {
                this.private.matchedElements.push(domEl);
            }

            //Send to node manager to handle ui changes
            var Handler = nodeManager.getHandler($el);
            new Handler.handle({
                el: domEl
            });

            var subscribe = function (subsChannel, varsToBind, $bindEl, options) {
                if (!varsToBind || !varsToBind.length) {
                    return false;
                }

                var subsid = subsChannel.subscribe(varsToBind, function (params) {
                    $bindEl.trigger(config.events.channelDataReceived, params);
                }, options);
                var subsAttr = config.attrs.subscriptionId;
                var newsubs = ($el.data(subsAttr) || []).concat(subsid);
                $el.attr(`data-${subsAttr}`, JSON.stringify(newsubs));
            };

            var attrBindings = [];
            var nonBatchableVariables = [];
            var channelConfig = domUtils.getChannelConfig(domEl);

            //NOTE: looping through attributes instead of .data because .data automatically camelcases properties and make it hard to retrvieve. Also don't want to index dynamically added (by flow) data attrs
            $(domEl.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                var attrVal = nodeMap.value;

                var channelPrefix = domUtils.getChannel($el, attr);
                
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
                        var withConv = attrVal.split('|').map((v)=> v.trim());
                        if (withConv.length > 1) {
                            attrVal = withConv.shift();
                            $el.data('f-convert-' + attr, withConv);
                        }

                        var binding = { attr: attr };
                        var commaRegex = /,(?![^[]*])/;

                        //NOTE: do this within init?
                        if (handler && handler.parse) {
                            //Let the handler do any pre-processing of inputs necessary
                            attrVal = handler.parse.call($el, attrVal);
                        }

                        if (attrVal.indexOf('<%') !== -1) {
                            //Assume it's templated for later use

                        } else if (attrVal.split(commaRegex).length > 1) {
                            var varsToBind = attrVal.split(commaRegex).map((v)=> v.trim());
                            if (channelPrefix) {
                                varsToBind = varsToBind.map(function (v) {
                                    return channelPrefix + ':' + v;
                                });
                            }
                            subscribe(channel, varsToBind, $el, $.extend({ batch: true }, channelConfig)); //TODO: Move batch defaults to subscription manager
                            binding.topics = varsToBind;
                        } else {
                            if (channelPrefix) {
                                attrVal = channelPrefix + ':' + attrVal;
                            }
                            binding.topics = [attrVal];
                            nonBatchableVariables.push(attrVal);
                        }
                        attrBindings.push(binding);
                    }
                }
            });
            $el.data(config.attrs.bindingsList, attrBindings);
            if (nonBatchableVariables.length) {
                subscribe(channel, nonBatchableVariables, $el, $.extend({ batch: false }, channelConfig));
            }
        },

        /**
         * Bind all provided elements.
         *
         * @param  {JQuery<HTMLElement>} elementsToBind (Optional) If not provided, binds all matching elements within default root provided at initialization.
         * @returns {void}
         */
        bindAll: function (elementsToBind) {
            if (!elementsToBind) {
                elementsToBind = getMatchingElements(this.options.root);
            } else if (!isArray(elementsToBind)) {
                elementsToBind = getMatchingElements(elementsToBind);
            }

            var me = this;
            //parse through dom and find everything with matching attributes
            $.each(elementsToBind, function (index, element) {
                me.bindElement(element, me.options.channel);
            });
        },
        /**
         * Unbind provided elements.
         *
         * @param  {JQuery<HTMLElement>} elementsToUnbind (Optional) If not provided, unbinds everything.
         * @returns {void}
         */
        unbindAll: function (elementsToUnbind) {
            var me = this;
            if (!elementsToUnbind) {
                elementsToUnbind = this.private.matchedElements;
            } else if (!isArray(elementsToUnbind)) {
                elementsToUnbind = getMatchingElements(elementsToUnbind);
            }
            $.each(elementsToUnbind, function (index, element) {
                me.unbindElement(element, me.options.channel);
            });
        },

        /**
         * Initialize the DOM Manager to work with a particular HTML element and all elements within that root. Data bindings between individual HTML elements and the model variables specified in the attributes will happen via the channel.
         *
         * @param {Object} options (Optional) Overrides for the default options.
         * @param {string} options.root The root HTML element being managed by this instance of the DOM Manager. Defaults to `body`.
         * @param {Object} options.channel The channel to communicate with. Defaults to the Channel Manager from [Epicenter.js](../../../api_adapters/).
         * @param {boolean} options.autoBind If `true` (default), any variables added to the DOM after `Flow.initialize()` has been called will be automatically parsed, and subscriptions added to channels. Note, this does not work in IE versions < 11.
         * @returns {Promise}
         */
        initialize: function (options) {
            var defaults = {
                /**
                 * Root of the element for flow.js to manage from.
                 * @type {String} jQuery selector
                 */
                root: 'body',
                channel: null,

                /**
                 * Any variables added to the DOM after `Flow.initialize()` has been called will be automatically parsed, and subscriptions added to channels. Note, this does not work in IE versions < 11.
                 * @type {Boolean}
                 */
                autoBind: true
            };
            $.extend(defaults, options);

            var channel = defaults.channel;

            this.options = defaults;

            var me = this;
            var $root = $(defaults.root);

            var attachChannelListener = function ($root) {
                $root.off(config.events.channelDataReceived).on(config.events.channelDataReceived, function (evt, data) {
                    var $el = $(evt.target);
                    var bindings = $el.data(config.attrs.bindingsList);
                    var toconvert = {};
                    $.each(data, function (variableName, value) {
                        _.each(bindings, function (binding) {
                            var channelPrefix = domUtils.getChannel($el, binding.attr);
                            var interestedTopics = binding.topics;
                            if (includes(interestedTopics, variableName)) {
                                if (binding.topics.length > 1) {
                                    var matching = pick(data, interestedTopics);
                                    if (!channelPrefix) {
                                        value = matching;
                                    } else {
                                        value = Object.keys(matching).reduce(function (accum, key) {
                                            var k = key.replace(channelPrefix + ':', '');
                                            accum[k] = matching[key]; 
                                            return accum;
                                        }, {});
                                    }
                                }
                                toconvert[binding.attr] = value;
                            }
                        });
                    });
                    $el.trigger(config.events.convert, toconvert);
                });
            };

            var attachUIVariablesListener = function ($root) {
                $root.off(config.events.trigger).on(config.events.trigger, function (evt, data) {
                    var parsedData = {}; //if not all subsequent listeners will get the modified data

                    var $el = $(evt.target);
                    var attrConverters = domUtils.getConvertersList($el, 'bind');

                    _.each(data, function (val, key) {
                        key = key.split('|')[0].trim(); //in case the pipe formatting syntax was used
                        val = converterManager.parse(val, attrConverters);
                        parsedData[key] = parseUtils.toImplicitType(val);

                        $el.trigger(config.events.convert, { bind: val });
                    });

                    channel.publish(parsedData);
                });
            };

            var attachUIOperationsListener = function ($root) {
                $root.off(config.events.operate).on(config.events.operate, function (evt, data) {
                    var filtered = ([].concat(data.operations || [])).reduce(function (accum, operation) {
                        var val = operation.value ? [].concat(operation.value) : [];
                        operation.value = val.map(function (val) {
                            return parseUtils.toImplicitType($.trim(val));
                        });
                        var isConverter = converterManager.getConverter(operation.name);
                        if (isConverter) {
                            accum.converters.push(operation);
                        } else {
                            //TODO: Add a test for this
                            if (operation.name.indexOf(':') === -1) {
                                operation.name = 'operations:' + operation.name;
                            }
                            accum.operations.push(operation);
                        }
                        return accum;
                    }, { operations: [], converters: [] });

                    var promise = (filtered.operations.length) ?
                        channel.publish(filtered.operations, data.options) :
                        $.Deferred().resolve().promise();
                     
                    //FIXME: Needed for the 'gotopage' in interfacebuilder. Remove this once we add a window channel
                    promise.then(function (args) {
                        _.each(filtered.converters, function (con) {
                            converterManager.convert(con.value, [con.name]);
                        });
                    });
                });
            };

            var attachConversionListner = function ($root) {
                // data = {proptoupdate: value} || just a value (assumes 'bind' if so)
                $root.off(config.events.convert).on(config.events.convert, function (evt, data) {
                    var $el = $(evt.target);

                    var convert = function (val, prop) {
                        prop = prop.toLowerCase();
                        var attrConverters = domUtils.getConvertersList($el, prop);

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
            };
            
            var promise = $.Deferred();
            $(function () {
                me.bindAll();

                attachChannelListener($root);
                attachUIVariablesListener($root);
                attachUIOperationsListener($root);
                attachConversionListner($root);

                if (me.options.autoBind) {
                    autoUpdatePlugin($root.get(0), me);
                }
                
                promise.resolve($root);
                $root.trigger('f.domready');
            });

            return promise;
        }
    };

    return $.extend(this, publicAPI);
}());
