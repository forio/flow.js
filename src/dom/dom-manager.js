import { getConvertersForEl, getChannelForAttribute, getChannelConfigForElement, parseTopicsFromAttributeValue } from './dom-manager-utils/dom-parse-helpers';

import { addPrefixToTopics, addDefaultPrefix } from './dom-manager-utils/dom-channel-prefix-helpers';
import { toImplicitType } from 'utils/parse-utils';

import { pick, isEqual } from 'lodash';

import { prefix, errorAttr, events, animation } from '../config';

import converterManager from './converter-manager';
import nodeManager from './node-manager';
import attrManager from './attribute-manager';
import autoUpdatePlugin from './plugins/auto-update-bindings';

export default (function () {
    //Jquery selector to return everything which has a f- property set
    $.expr.pseudos[prefix] = function (el) {
        if (!el || !el.attributes) {
            return false;
        }
        for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i].nodeName;
            if (attr.indexOf('data-' + prefix) === 0) {
                return true;
            }
        }
        return false;
    };

    /**
     * @param {JQuery<HTMLElement>} root
     * @returns {JQuery<HTMLElement>}
     */
    function getMatchingElements(root) {
        const $root = $(root);
        let matchedElements = $root.find(':' + prefix);
        if ($root.is(':' + prefix)) {
            matchedElements = matchedElements.add($root);
        }
        return matchedElements;
    }

    /**
     * @param {JQuery<HTMLElement> | HTMLElement} element
     * @param {*} [context]
     * @returns {HTMLElement}
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
    function triggerError($el, e) {
        let msg = e.message || e;
        if ($.isPlainObject(msg)) {
            msg = JSON.stringify(msg);
        }
        $el.attr(errorAttr, msg).trigger(events.error, e);
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
    function removeAllSubscriptions(subscriptions, channel, el) {
        [].concat(subscriptions).forEach(function (subs) {
            try {
                channel.unsubscribe(subs);
            } catch (e) {
                triggerError(el, e);
            }
        });
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
         * @param {Channel} channel (Optional) The channel from which to unsubscribe. Defaults to the [variables channel](../channels/variables-channel/).
         * @returns {void}
         */
        unbindElement: function (element, channel) {
            if (!channel) {
                channel = this.options.channel;
            }
            const domEl = getElementOrError(element);
            const $el = $(element);
            const existingData = this.matchedElements.get(domEl);
            if (!$el.is(':' + prefix) || !existingData) {
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
            removeAllSubscriptions(subscriptions, channel, $el);

            const animAttrs = Object.keys(animation).join(' ');
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
         * @param {HTMLElement | JQuery<HTMLElement>} element The element to add to the data binding.
         * @param {Channel} channel (Optional) The channel to subscribe to. Defaults to the [run channel](../channels/run-channel/).
         * @returns {void}
         */
        bindElement: function (element, channel) {
            const opts = this.options || {};
            if (!channel) {
                channel = opts.channel;
            }
            // this.unbindElement(element); //unbind actually removes the data,and jquery doesn't refetch when .data() is called..
            const domEl = getElementOrError(element);
            const $el = $(domEl);
            const isExcluded = opts.exclude && $el.is(opts.exclude);
            if (!$el.is(`:${prefix}`) || isExcluded) {
                return;
            }

            //Send to node manager to handle ui changes
            const changeEventOverrides = opts.uiChangeEvents || {};
            const triggerSelector = Object.keys(changeEventOverrides).find((selector)=> {
                return $el.is(selector);
            });
            const matchingEvent = triggerSelector && changeEventOverrides[triggerSelector];
            const Handler = nodeManager.getHandler($el);
            new Handler.handle({
                el: domEl,
                triggerChangeOn: matchingEvent
            });

            const filterPrefix = `data-${prefix}-`;
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
                if (topics.length && handler && handler.parse) {
                    topics = [].concat(handler.parse(topics));
                }

                const channelPrefix = getChannelForAttribute($el, attr);
                topics = addPrefixToTopics(topics, channelPrefix);

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

                const subsOptions = $.extend({
                    batch: true,
                    onError: (e)=> {
                        console.error('DomManager: Subscription error', domEl, e);
                        triggerError($el, e);
                    }
                }, channelConfig);
                const subscribableTopics = topics.map((t)=> t.name);
                const subsid = channel.subscribe(subscribableTopics, (data, meta)=> {
                    if (meta && isEqual(data, meta.previousData)) {
                        return;
                    }
                    const toConvert = {};
                    if (subscribableTopics.length === 1) { //If I'm only interested in 1 thing pass in value directly, else make a map;
                        toConvert[name] = data[subscribableTopics[0]];
                    } else {
                        const dataForAttr = pick(data, subscribableTopics) || {};
                        toConvert[name] = Object.keys(dataForAttr).reduce((accum, key)=> {
                            //If this was through a auto-prefixed channel attr return what was bound
                            const toReplace = new RegExp(`^${channelPrefix}:`);
                            const k = channelPrefix ? key.replace(toReplace, '') : key;
                            accum[k] = dataForAttr[key];
                            return accum;
                        }, {});
                    }
                    $el.removeAttr(errorAttr).trigger(events.convert, toConvert);
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

            //parse through dom and find everything with matching attributes
            $.each(elementsToBind, (index, element)=> {
                this.bindElement(element, this.options.channel);
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
                 * @type {string} jQuery selector
                 */
                root: 'body',
                channel: null,

                /**
                 * Exclude elements matching these selectors from being bound
                 */
                exclude: 'pre *',

                /**
                 * Any elements added to the DOM after `Flow.initialize()` has been called will be automatically bound, and subscriptions added to channels.
                 * @type {boolean}
                 */
                autoBind: true,

                /**
                 * By default Flow triggers events on 'change', but you may want to trigger on, say, 'keypress' for specific inputs. Set { uiChangeEvents: { [selector]: 'keypress' } } for such cases
                 */
                uiChangeEvents: {

                }
            };
            $.extend(defaults, options);

            const channel = defaults.channel;

            this.options = defaults;

            const me = this;
            const $root = $(defaults.root);

            function attachUIListeners($root) {
                function parseValue(value, converters) {
                    if (Array.isArray(value)) {
                        const parsed = value.map(function (val) {
                            return toImplicitType(val);
                        });
                        return converterManager.parse(parsed, converters);
                    }
                    return converterManager.parse(toImplicitType(value), converters);
                }

                $root.off(events.trigger).on(events.trigger, function (evt, params) {
                    const elMeta = me.matchedElements.get(evt.target);
                    const { data, source, options, restoreOriginal } = params;

                    if (!elMeta || !data) {
                        return;
                    }
                    const sourceMeta = elMeta[source] || {};
                    const { channelPrefix, converters } = sourceMeta;
                    const $el = $(evt.target);

                    const parsed = ([].concat(data)).map(function (action) {
                        const { name, value } = action;
                        const parsedValue = parseValue(value, converters);
                        const actualName = name.split('|')[0].trim(); //FIXME: this shouldn't know about the pipe syntax
                        const prefixedName = addDefaultPrefix(actualName, source, channelPrefix);
                        return { name: prefixedName, value: parsedValue };
                    }, []);

                    if (restoreOriginal) {
                        //Ideally this should simply be a fetch to the previous version of the variable to use that.
                        me.unbindElement($el, channel);
                        me.bindElement($el, channel);
                        return;
                    }

                    channel.publish(parsed, options).then((result)=> {
                        if (!result || !result.length) {
                            return;
                        }
                        const last = result[result.length - 1];
                        $el.trigger(events.convert, { [source]: last.value });
                    }, (e)=> {
                        triggerError($el, e);
                    });
                });
            }

            function attachConversionListner($root) {
                // data = {proptoupdate: value}
                $root.off(events.convert).on(events.convert, function (evt, data) {
                    const $el = $(evt.target);

                    const elMeta = me.matchedElements.get(evt.target);
                    if (!elMeta) {
                        return;
                    }

                    Object.keys(data).forEach((prop)=> {
                        const val = data[prop];
                        const { converters, topics } = elMeta[prop];
                        const convertedValue = converterManager.convert(val, converters);

                        const handler = attrManager.getHandler(prop, $el);
                        handler.handle(convertedValue, prop, $el, topics);
                    });
                });
            }

            const deferred = $.Deferred();
            $(function () {
                me.bindAll();

                attachUIListeners($root);
                attachConversionListner($root);

                me.plugins.autoBind = autoUpdatePlugin($root.get(0), me, me.options.autoBind);

                deferred.resolve($root);
                $root.trigger('f.domready');
            });

            return deferred.promise();
        }
    };

    return $.extend(this, publicAPI);
}());
