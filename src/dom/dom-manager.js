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
const { getConvertersForEl, getChannelForAttribute, getChannelConfigForElement, parseTopicsFromAttributeValue } = require('./dom-parse-helpers');
const { pick } = require('lodash');

const config = require('../config');
const parseUtils = require('utils/parse-utils');

const converterManager = require('converters/converter-manager');
const nodeManager = require('./nodes/node-manager');
const attrManager = require('./attributes/attribute-manager');
const autoUpdatePlugin = require('./plugins/auto-update-bindings');

module.exports = (function () {
    //Jquery selector to return everything which has a f- property set
    $.expr.pseudos[config.prefix] = function (el) {
        if (!el || !el.attributes) {
            return false;
        }
        for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i].nodeName;
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
    function getMatchingElements(root) {
        const $root = $(root);
        let matchedElements = $root.find(':' + config.prefix);
        if ($root.is(':' + config.prefix)) {
            matchedElements = matchedElements.add($root);
        }
        return matchedElements;
    }

    /**
     * @param {JQuery<HTMLElement> | HTMLElement} element
     * @param {*} [context]
     * @return {HTMLElement}
     */ 
    function getElementOrError(element, context) {
        const el = (element instanceof $) ? element.get(0) : element;
        if (!el || !el.nodeName) {
            console.error(context, 'Expected to get DOM Element, got ', element);
            throw new Error(context + ': Expected to get DOM Element, got' + (typeof element));
        }
        return el;
    }

    //Unbind utils
    function removeAllSubscriptions(subscriptions, channel) {
        [].concat(subscriptions).forEach(function (subs) {
            channel.unsubscribe(subs);
        });
    }
    function unbindAllAttributes(domEl) {
        const $el = $(domEl);
        $(domEl.attributes).each(function (index, nodeMap) {
            let attr = nodeMap.nodeName;
            const wantedPrefix = 'data-f-';
            if (attr.indexOf(wantedPrefix) === 0) {
                attr = attr.replace(wantedPrefix, '');
                const handler = attrManager.getHandler(attr, $el);
                if (handler.unbind) {
                    handler.unbind(attr, $el);
                }
            }
        });
    }
    function unbindAllNodeHandlers(domEl) {
        const $el = $(domEl);
        //FIXME: have to readd events to be able to remove them. Ugly
        const Handler = nodeManager.getHandler($el);
        const h = new Handler.handle({
            el: domEl
        });
        if (h.removeEvents) {
            h.removeEvents();
        }
    }

    const publicAPI = {

        nodes: nodeManager,
        attributes: attrManager,
        converters: converterManager,
            
        matchedElements: new Map(),

        /**
         * Unbind the element; unsubscribe from all updates on the relevant channels.
         *
         * @param {JQuery<HTMLElement> | HTMLElement} element The element to remove from the data binding.
         * @param {ChannelInstance} channel (Optional) The channel from which to unsubscribe. Defaults to the [variables channel](../channels/variables-channel/).
         * @returns {void}
         */
        unbindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel;
            }
            const domEl = getElementOrError(element);
            const $el = $(element);
            const existingData = this.matchedElements.get(domEl);
            if (!$el.is(':' + config.prefix) || !existingData) {
                return;
            }
            this.matchedElements.delete(element);

            const subscriptions = Object.keys(existingData).reduce((accum, a)=> {
                const subsid = existingData[a].subscriptionId;
                if (subsid) accum.push(subsid);
                return accum;
            }, []);

            unbindAllNodeHandlers(domEl);
            unbindAllAttributes(domEl);
            removeAllSubscriptions(subscriptions, channel);
            
            const animAttrs = Object.keys(config.animation).join(' ');
            $el.removeAttr(animAttrs);

            Object.keys($el.data()).forEach(function (key) {
                if (key.indexOf('f-') === 0 || key.match(/^f[A-Z]/)) {
                    $el.removeData(key);
                }
            });
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
            // this.unbindElement(element); //unbind actually removes the data,and jquery doesn't refetch when .data() is called..
            const domEl = getElementOrError(element);
            const $el = $(domEl);
            if (!$el.is(`:${config.prefix}`)) {
                return;
            }

            //Send to node manager to handle ui changes
            const Handler = nodeManager.getHandler($el);
            new Handler.handle({
                el: domEl
            });

            const filterPrefix = `data-${config.prefix}-`;
            const attrList = {};
            $(domEl.attributes).each(function (index, nodeMap) {
                let attr = nodeMap.nodeName;
                if (attr.indexOf(filterPrefix) !== 0) {
                    return;
                } 
                attr = attr.replace(filterPrefix, '');

                const attrVal = nodeMap.value;
                let topics = parseTopicsFromAttributeValue(attrVal);
                
                const handler = attrManager.getHandler(attr, $el);
                if (handler && handler.init) {
                    handler.init(attr, topics, $el);
                }
                if (handler && handler.parse) {
                    topics = [].concat(handler.parse(topics));
                }
                
                const channelPrefix = getChannelForAttribute($el, attr);
                if (channelPrefix) {
                    topics = topics.map((topic)=> {
                        const currentName = topic.name;
                        const hasChannelDefined = currentName.indexOf(':') !== -1;
                        if (!hasChannelDefined) {
                            topic.name = `${channelPrefix}:${currentName}`;
                        }
                        return topic;
                    });
                }
                const converters = getConvertersForEl($el, attr);
                attrList[attr] = {
                    channelPrefix: channelPrefix,
                    topics: topics,
                    converters: converters, //Store once instead of calculating on demand. Avoids having to parse through dom every time
                };
            });
            //Need this to be set before subscribing or callback maybe called before it's set
            this.matchedElements.set(domEl, attrList);
            
            const channelConfig = getChannelConfigForElement(domEl);
            const attrsWithSubscriptions = Object.keys(attrList).reduce((accum, name)=> {
                const attr = attrList[name];
                const { topics, channelPrefix } = attr;
                if (!topics.length) {
                    accum[name] = attr;
                    return accum;
                }

                const subsOptions = $.extend({ batch: true }, channelConfig);
                const subscribableTopics = topics.map((t)=> t.name);
                const subsid = channel.subscribe(subscribableTopics, (data)=> {
                    const toConvert = {};
                    if (subscribableTopics.length === 1) { //If I'm only interested in 1 thing pass in value directly, else mke a map;
                        toConvert[name] = data[subscribableTopics[0]];
                    } else {
                        const dataForAttr = pick(data, subscribableTopics) || {};
                        toConvert[name] = Object.keys(dataForAttr).reduce((accum, key)=> {
                            //If this was through a 'hidden' channel attr return what was bound
                            const toReplace = new RegExp(`^${channelPrefix}:`);
                            const k = channelPrefix ? key.replace(toReplace, '') : key;
                            accum[k] = dataForAttr[key];
                            return accum;
                        }, {});
                    }
                    $el.trigger(config.events.convert, toConvert);
                }, subsOptions);

                accum[name] = Object.assign({}, attr, { subscriptionId: subsid });
                return accum;
            }, {});

            this.matchedElements.set(domEl, attrsWithSubscriptions);
        },

        /**
         * Bind all provided elements.
         *
         * @param  {JQuery<HTMLElement> | HTMLElement[]} [elementsToBind] (Optional) If not provided, binds all matching elements within default root provided at initialization.
         * @returns {void}
         */
        bindAll: function (elementsToBind) {
            if (!elementsToBind) {
                elementsToBind = getMatchingElements(this.options.root);
            } else if (!Array.isArray(elementsToBind)) {
                elementsToBind = getMatchingElements(elementsToBind);
            }

            const me = this;
            //parse through dom and find everything with matching attributes
            $.each(elementsToBind, function (index, element) {
                me.bindElement(element, me.options.channel);
            });
        },
        /**
         * Unbind provided elements.
         *
         * @param  {JQuery<HTMLElement> | HTMLElement[]} [elementsToUnbind] (Optional) If not provided, unbinds everything.
         * @returns {void}
         */
        unbindAll: function (elementsToUnbind) {
            const me = this;
            if (!elementsToUnbind) {
                elementsToUnbind = [];
                this.matchedElements.forEach((val, key)=> {
                    elementsToUnbind.push(key);
                });
            } else if (!Array.isArray(elementsToUnbind)) {
                elementsToUnbind = getMatchingElements(elementsToUnbind);
            }
            $.each(elementsToUnbind, function (index, element) {
                me.unbindElement(element, me.options.channel);
            });
        },

        plugins: {},

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
            const defaults = {
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

            const channel = defaults.channel;

            this.options = defaults;

            const me = this;
            const $root = $(defaults.root);

            const DEFAULT_OPERATIONS_PREFIX = 'operations:';
            const DEFAULT_VARIABLES_PREFIX = 'variables:';

            //TODO: Merge the two listeners and just have prefix by 'source';
            //TODO: ONce it's merged, support && for multiple operations and | to pipe to converters
            function attachUIVariablesListener($root) {
                $root.off(config.events.trigger).on(config.events.trigger, function (evt, params) {
                    const elMeta = me.matchedElements.get(evt.target);
                    if (!elMeta) {
                        return;
                    }

                    const { data, source, options } = params;
                    const { converters, channelPrefix } = elMeta[source] || {};
                    const $el = $(evt.target);

                    const parsed = [];
                    data.forEach((d)=> {
                        const { value, name } = d;
                        const converted = converterManager.parse(value, converters);
                        const typed = parseUtils.toImplicitType(converted);

                        let key = name.split('|')[0].trim(); //in case the pipe formatting syntax was used
                        const canPrefix = key.indexOf(':') === -1 || key.indexOf(DEFAULT_VARIABLES_PREFIX) === 0;
                        if (canPrefix && channelPrefix) {
                            key = `${channelPrefix}:${key}`;
                        }
                        parsed.push({ name: key, value: typed });

                        const convertParams = {};
                        convertParams[source] = typed;
                        $el.trigger(config.events.convert, convertParams);
                    });
                    channel.publish(parsed, options);
                });
            }

            function attachUIOperationsListener($root) {
                $root.off(config.events.operate).on(config.events.operate, function (evt, params) {
                    const elMeta = me.matchedElements.get(evt.target);
                    if (!elMeta) {
                        return;
                    }
                    const { data, source, options } = params;
                    const sourceMeta = elMeta[source] || {};

                    const filtered = ([].concat(data || [])).reduce(function (accum, operation) {
                        const val = operation.value;
                        if (Array.isArray(val)) {
                            operation.value = val.map(function (val) {
                                return parseUtils.toImplicitType(val);
                            });
                        } else {
                            operation.value = parseUtils.toImplicitType(val);
                        }

                        const isConverter = converterManager.getConverter(operation.name);
                        if (isConverter) {
                            accum.converters.push(operation);
                        } else {
                            if (operation.name.indexOf(':') === -1) {
                                operation.name = `${DEFAULT_OPERATIONS_PREFIX}${operation.name}`;
                            }
                            if (operation.name.indexOf(DEFAULT_OPERATIONS_PREFIX) === 0 && sourceMeta.channelPrefix) {
                                operation.name = `${sourceMeta.channelPrefix}:${operation.name}`;
                            }
                            accum.operations.push(operation);
                        }
                        return accum;
                    }, { operations: [], converters: [] });

                    const promise = (filtered.operations.length) ?
                        channel.publish(filtered.operations, options) :
                        $.Deferred().resolve().promise();
                     
                    //FIXME: Needed for the 'gotopage' in interfacebuilder. Remove this once we add a window channel
                    promise.then(function (args) {
                        filtered.converters.forEach(function (con) {
                            converterManager.convert(con.value, [con.name]);
                        });
                    });
                });
            }

            function attachConversionListner($root) {
                // data = {proptoupdate: value} || just a value (assumes 'bind' if so)
                $root.off(config.events.convert).on(config.events.convert, function (evt, data) {
                    const $el = $(evt.target);

                    const elMeta = me.matchedElements.get(evt.target);
                    if (!elMeta) {
                        return;
                    }

                    function convert(val, prop) {
                        const { converters, topics } = elMeta[prop];
                        const convertedValue = converterManager.convert(val, converters);

                        const handler = attrManager.getHandler(prop, $el);
                        handler.handle(convertedValue, prop, $el, topics);
                    }

                    if ($.isPlainObject(data)) {
                        _.each(data, convert);
                    } else {
                        convert(data, 'bind');
                    }
                });
            }
            
            const promise = $.Deferred();
            $(function () {
                me.bindAll();
            
                attachUIVariablesListener($root);
                attachUIOperationsListener($root);
                attachConversionListner($root);

                me.plugins.autoBind = autoUpdatePlugin($root.get(0), me, me.options.autoBind);
                
                promise.resolve($root);
                $root.trigger('f.domready');
            });

            return promise;
        }
    };

    return $.extend(this, publicAPI);
}());
