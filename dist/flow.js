var Flow =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * ## Flow.js Initialization
	 *
	 * To use Flow.js in your project, simply call `Flow.initialize()` in your user interface. In the basic case, `Flow.initialize()` can be called without any arguments. While Flow.js needs to know the account, project, and model you are using, by default these values are extracted from the URL of Epicenter project and by the use of `data-f-model` in your `<body>` tag. See more on the [basics of using Flow.js in your project.](../../#using_in_project).
	 *
	 * However, sometimes you want to be explicit in your initialization call, and there are also some additional parameters that let you customize your use of Flow.js.
	 *
	 * #### Parameters
	 *
	 * The parameters for initializing Flow.js include:
	 *
	 * * `channel` Configuration details for the channel Flow.js uses in connecting with underlying APIs.
	 * * `channel.strategy` The run creation strategy describes when to create new runs when an end user visits this page. The default is `new-if-persisted`, which creates a new run when the end user is idle for longer than your project's **Model Session Timeout** (configured in your project's [Settings](../../../updating_your_settings/)), but otherwise uses the current run.. See more on [Run Strategies](../../../api_adapters/strategy/).
	 * * `channel.run` Configuration details for each run created.
	 * * `channel.run.account` The **User ID** or **Team ID** for this project. By default, taken from the URL where the user interface is hosted, so you only need to supply this is you are running your project's user interface [on your own server](../../../how_to/self_hosting/).
	 * * `channel.run.project` The **Project ID** for this project.
	 * * `channel.run.model` Name of the primary model file for this project. By default, taken from `data-f-model` in your HTML `<body>` tag.
	 * * `channel.run.variables` Configuration options for the variables being listened to on this channel.
	 * * `channel.run.variables.silent` Provides granular control over when user interface updates happen for changes on this channel. See below for possible values.
	 * * `channel.run.variables.autoFetch` Options for fetching variables from the API as they're being subscribed. See [Variables Channel](../channels/variables-channel/) for details.
	 * * `channel.run.operations` Configuration options for the operations being listened to on this channel. Currently there is only one configuration option: `silent`.
	 * * `channel.run.operations.silent` Provides granular control over when user interface updates happen for changes on this channel. See below for possible values.
	 * * `channel.run.server` Object with additional server configuration, defaults to `host: 'api.forio.com'`.
	 * * `channel.run.transport` An object which takes all of the jquery.ajax options at <a href="http://api.jquery.com/jQuery.ajax/">http://api.jquery.com/jQuery.ajax/</a>.
	 * * `dom` Configuration options for the DOM where this instance of Flow.js is created.
	 * * `dom.root` The root HTML element being managed by the Flow.js DOM Manager. Defaults to `body`.
	 * * `dom.autoBind` If `true` (default), automatically parse variables added to the DOM after this `Flow.initialize()` call. Note, this does not work in IE versions < 11.
	 *
	 * The `silent` configuration option for the `run.variables` and `run.operations` is a flag for providing more granular control over when user interface updates happen for changes on this channel. Values can be:
	 *
	 * * `false`: Always update the UI for any changes (variables updated, operations called) on this channel. This is the default behavior.
	 * * `true`: Never update the UI for any on changes (variables updated, operations called) on this channel.
	 * * Array of variables or operations for which the UI *should not* be updated. For example, `variables: { silent: [ 'price', 'sales' ] }` means this channel is silent (no updates for the UI) when the variables 'price' or 'sales' change, and the UI is always updated for any changes to other variables. This is useful if you know that changing 'price' or 'sales' does not impact anything else in the UI directly, for instance.
	 * * `except`: With array of variables or operations for which the UI *should* be updated. For example, `variables { silent: { except: [ 'price', 'sales' ] } }` is the converse of the above. The UI is always updated when anything on this channel changes *except* when the variables 'price' or 'sales' are updated.
	 *
	 * Although Flow.js provides a bi-directional binding between the model and the user interface, the `silent` configuration option applies only for the binding from the model to the user interface; updates in the user interface (including calls to operations) are still sent to the model.
	 *
	 * The `Flow.initialize()` call is based on the Epicenter.js [Run Service](../../../api_adapters/generated/run-api-service/) from the [API Adapters](../../../api_adapters/). See those pages for additional information on parameters.
	 *
	 * The `Flow.initialize()` call returns a promise, which is resolved when initialization is complete.
	 *
	 * #### Example
	 *
	 *      Flow.initialize({
	 *          channel: {
	 *              strategy: 'new-if-persisted',
	 *              run: {
	 *                  model: 'supply-chain-game.py',
	 *                  account: 'acme-simulations',
	 *                  project: 'supply-chain-game',
	 *                  server: { host: 'api.forio.com' },
	 *                  variables: { silent: ['price', 'sales'] },
	 *                  operations: { silent: false },
	 *                  transport: {
	 *                      beforeSend: function() { $('body').addClass('loading'); },
	 *                      complete: function() { $('body').removeClass('loading'); }
	 *                  }
	 *              }
	 *          }
	 *      }).then(function() {
	 *          // code that depends on initialization
	 *      });
	 *
	 */
	
	'use strict';
	
	var domManager = __webpack_require__(1);
	var Channel = __webpack_require__(31);
	var BaseView = __webpack_require__(15);
	
	var Flow = {
	    dom: domManager,
	    utils: {
	        BaseView: BaseView
	    },
	    initialize: function (config) {
	        var model = $('body').data('f-model');
	
	        var defaults = {
	            channel: {
	                run: {
	                    account: '',
	                    project: '',
	                    model: model,
	
	                    operations: {
	                    },
	                    variables: {
	                        autoFetch: {
	                            start: false
	                        }
	                    }
	                }
	            },
	            dom: {
	                root: 'body',
	                autoBind: true
	            }
	        };
	
	        var options = $.extend(true, {}, defaults, config);
	        var $root = $(options.dom.root);
	        var initFn = $root.data('f-on-init');
	        var opnSilent = options.channel.run.operations.silent;
	        var isInitOperationSilent = initFn && (opnSilent === true || (_.isArray(opnSilent) && _.contains(opnSilent, initFn)));
	        var preFetchVariables = !initFn || isInitOperationSilent;
	
	        if (preFetchVariables) {
	            options.channel.run.variables.autoFetch.start = true;
	        }
	
	        if (config && config.channel && (config.channel instanceof Channel)) {
	            this.channel = config.channel;
	        } else {
	            this.channel = new Channel(options.channel);
	        }
	
	        return domManager.initialize($.extend(true, {
	            channel: this.channel
	        }, options.dom));
	    }
	};
	//set by grunt
	if (true) Flow.version = ("0.11.0"); //eslint-disable-line no-undef
	module.exports = Flow;


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * ## DOM Manager
	 *
	 * The Flow.js DOM Manager provides two-way data bindings from your project's user interface to the channel. The DOM Manager is the 'glue' through which HTML DOM elements -- including the attributes and attribute handlers provided by Flow.js for [variables](../../attributes-overview/), [operations](../../operations-overview/) and [conversion](../../converter-overview/), and those [you create](./attributes/attribute-manager/) -- are bound to the variable and operations [channels](../../channel-overview/) to link them with your project's model. See the [Epicenter architecture details](../../../creating_your_interface/arch_details/) for a visual description of how the DOM Manager relates to the [rest of the Epicenter stack](../../../creating_your_interface/).
	 *
	 * The DOM Manager is an integral part of the Flow.js architecture but, in keeping with our general philosophy of extensibility and configurability, it is also replaceable. For instance, if you want to manage your DOM state with [Backbone Views](http://backbonejs.org) or [Angular.js](https://angularjs.org), while still using the channels to handle the communication with your model, this is the piece you'd replace. [Contact us](http://forio.com/about/contact/) if you are interested in extending Flow.js in this way -- we'll be happy to talk about it in more detail.
	 *
	 */
	'use strict';
	
	module.exports = (function () {
	    var config = __webpack_require__(2);
	    var parseUtils = __webpack_require__(3);
	    var domUtils = __webpack_require__(4);
	
	    var converterManager = __webpack_require__(5);
	    var nodeManager = __webpack_require__(11);
	    var attrManager = __webpack_require__(16);
	    var autoUpdatePlugin = __webpack_require__(30);
	
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
	
	    var getMatchingElements = function (root) {
	        var $root = $(root);
	        var matchedElements = $root.find(':' + config.prefix);
	        if ($root.is(':' + config.prefix)) {
	            matchedElements = matchedElements.add($root);
	        }
	        return matchedElements;
	    };
	
	    var getElementOrError = function (element, context) {
	        if (element instanceof $) {
	            element = element.get(0);
	        }
	        if (!element || !element.nodeName) {
	            console.error(context, 'Expected to get DOM Element, got ', element);
	            throw new Error(context + ': Expected to get DOM Element, got' + (typeof element));
	        }
	        return element;
	    };
	
	    var publicAPI = {
	
	        nodes: nodeManager,
	        attributes: attrManager,
	        converters: converterManager,
	        //utils for testing
	        private: {
	            matchedElements: []
	        },
	
	        /**
	         * Unbind the element: unsubscribe from all updates on the relevant channels.
	         *
	         * @param {DomElement} element The element to remove from the data binding.
	         * @param {ChannelInstance} channel (Optional) The channel from which to unsubscribe. Defaults to the [variables channel](../channels/variables-channel/).
	         * @returns {undefined}
	         */
	        unbindElement: function (element, channel) {
	            if (!channel) {
	                channel = this.options.channel.variables;
	            }
	            element = getElementOrError(element);
	            var $el = $(element);
	            if (!$el.is(':' + config.prefix)) {
	                return false;
	            }
	            this.private.matchedElements = _.without(this.private.matchedElements, element);
	
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
	                    if (handler.unbind) {
	                        handler.unbind.call($el, attr);
	                    }
	                }
	            });
	
	            var subsid = $el.data(config.attrs.subscriptionId) || [];
	            _.each(subsid, function (subs) {
	                channel.unsubscribe(subs);
	            });
	
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
	         * @param {DomElement} element The element to add to the data binding.
	         * @param {ChannelInstance} channel (Optional) The channel to subscribe to. Defaults to the [variables channel](../channels/variables-channel/).
	         * @returns {undefined}
	         */
	        bindElement: function (element, channel) {
	            if (!channel) {
	                channel = this.options.channel.variables;
	            }
	            element = getElementOrError(element);
	            var $el = $(element);
	            if (!$el.is(':' + config.prefix)) {
	                return false;
	            }
	            if (!_.contains(this.private.matchedElements, element)) {
	                this.private.matchedElements.push(element);
	            }
	
	            //Send to node manager to handle ui changes
	            var Handler = nodeManager.getHandler($el);
	            new Handler.handle({
	                el: element
	            });
	
	            var subscribe = function (subsChannel, varsToBind, $bindEl, options) {
	                if (!varsToBind || !varsToBind.length) {
	                    return false;
	                }
	                var subsid = subsChannel.subscribe(varsToBind, $bindEl, options);
	                var newsubs = ($el.data(config.attrs.subscriptionId) || []).concat(subsid);
	                $el.data(config.attrs.subscriptionId, newsubs);
	            };
	
	            var attrBindings = [];
	            var nonBatchableVariables = [];
	            //NOTE: looping through attributes instead of .data because .data automatically camelcases properties and make it hard to retrvieve. Also don't want to index dynamically added (by flow) data attrs
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
	
	                        var binding = { attr: attr };
	                        var commaRegex = /,(?![^\[]*\])/;
	
	                        //NOTE: do this within init?
	                        if (handler && handler.parse) {
	                            //Let the handler do any pre-processing of inputs necessary
	                            attrVal = handler.parse.call($el, attrVal);
	                        }
	
	                        if (attrVal.indexOf('<%') !== -1) {
	                            //Assume it's templated for later use
	
	                        } else if (attrVal.split(commaRegex).length > 1) {
	                            var varsToBind = _.invoke(attrVal.split(commaRegex), 'trim');
	                            subscribe(channel, varsToBind, $el, { batch: true });
	                            binding.topics = varsToBind;
	                        } else {
	                            binding.topics = [attrVal];
	                            nonBatchableVariables.push(attrVal);
	                        }
	                        attrBindings.push(binding);
	                    }
	                }
	            });
	            $el.data(config.attrs.bindingsList, attrBindings);
	            if (nonBatchableVariables.length) {
	                subscribe(channel, nonBatchableVariables, $el, { batch: false });
	            }
	        },
	
	        /**
	         * Bind all provided elements.
	         *
	         * @param  {Array|jQuerySelector} elementsToBind (Optional) If not provided, binds all matching elements within default root provided at initialization.
	         * @returns {undefined}
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
	                me.bindElement(element, me.options.channel.variables);
	            });
	        },
	        /**
	         * Unbind provided elements.
	         *
	         * @param  {Array} elementsToUnbind (Optional) If not provided, unbinds everything.
	         * @returns {undefined}
	         */
	        unbindAll: function (elementsToUnbind) {
	            var me = this;
	            if (!elementsToUnbind) {
	                elementsToUnbind = this.private.matchedElements;
	            } else if (!_.isArray(elementsToUnbind)) {
	                elementsToUnbind = getMatchingElements(elementsToUnbind);
	            }
	            $.each(elementsToUnbind, function (index, element) {
	                me.unbindElement(element, me.options.channel.variables);
	            });
	        },
	
	        /**
	         * Initialize the DOM Manager to work with a particular HTML element and all elements within that root. Data bindings between individual HTML elements and the model variables specified in the attributes will happen via the channel.
	         *
	         * @param {Object} options (Optional) Overrides for the default options.
	         * @param {String} options.root The root HTML element being managed by this instance of the DOM Manager. Defaults to `body`.
	         * @param {Object} options.channel The channel to communicate with. Defaults to the Channel Manager from [Epicenter.js](../../../api_adapters/).
	         * @param {Boolean} options.autoBind If `true` (default), any variables added to the DOM after `Flow.initialize()` has been called will be automatically parsed, and subscriptions added to channels. Note, this does not work in IE versions < 11.
	         * @returns {undefined}
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
	                    // console.log(evt.target, data, "root on");
	                    var $el = $(evt.target);
	                    var bindings = $el.data(config.attrs.bindingsList);
	                    var toconvert = {};
	                    $.each(data, function (variableName, value) {
	                        _.each(bindings, function (binding) {
	                            if (_.contains(binding.topics, variableName)) {
	                                if (binding.topics.length > 1) {
	                                    toconvert[binding.attr] = _.pick(data, binding.topics);
	                                } else {
	                                    toconvert[binding.attr] = value;
	                                }
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
	
	                    channel.variables.publish(parsedData);
	                });
	            };
	
	            var attachUIOperationsListener = function ($root) {
	                $root.off(config.events.operate).on(config.events.operate, function (evt, data) {
	                    data = $.extend(true, {}, data); //if not all subsequent listeners will get the modified data
	                    _.each(data.operations, function (opn) {
	                        opn.params = _.map(opn.params, function (val) {
	                            return parseUtils.toImplicitType($.trim(val));
	                        });
	                    });
	
	                    //FIXME: once the channel manager is built out this hacky filtering goes away. There can just be a window channel which catches these
	                    var convertors = _.filter(data.operations, function (opn) {
	                        return !!converterManager.getConverter(opn.name);
	                    });
	                    data.operations = _.difference(data.operations, convertors);
	                    var promise = (data.operations.length) ?
	                        channel.operations.publish(_.omit(data, 'options'), data.options) :
	                        $.Deferred().resolve().promise();
	                    promise.then(function (args) {
	                        _.each(convertors, function (con) {
	                            converterManager.convert(con.params, [con.name]);
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


/***/ },
/* 2 */
/***/ function(module, exports) {

	'use strict';
	module.exports = {
	    prefix: 'f',
	    defaultAttr: 'bind',
	
	    binderAttr: 'f-bind',
	
	    events: {
	        //UI Change to publish to the channel.
	        trigger: 'update.f.ui',
	
	        //Payload is of form {topic: value}. When triggered on a element dom-manager will trigger 'f.convert' on every attribute subscribed to that topic
	        channelDataReceived: 'update.f.model',
	
	        //Trigger with payload '{attrToUpdate: value}', for e.g. { bind: 34 }. This will run this through all the converts and pass it to attr handler. Useful to by-pass getting this from the model directly.
	        convert: 'f.convert',
	
	        //When triggered posts the payload to the operations API. Assumes payloaded is formmatted in a way Run Channel can understand
	        operate: 'f.ui.operate'
	    },
	
	    attrs: {
	        //Array with shape [{ attr: attribute, topics:[list of topics attribute is listening to]}]
	        bindingsList: 'f-attr-bindings',
	
	        //Subscription id returned by the channel. Used to ubsubscribe later
	        subscriptionId: 'f-subscription-id',
	
	        //Used by the classes attr handler to keep track of which classes were added by itself
	        classesAdded: 'f-added-classes',
	
	        //Used by repeat attr handler to keep track of template after first evaluation
	        repeat: {
	            template: 'repeat-template',
	            templateId: 'repeat-template-id'
	        },
	
	        //Used by foreach attr handler to keep track of template after first evaluation
	        foreachTemplate: 'f-foreach-template',
	        keyAs: 'f-foreach-key-as',
	        valueAs: 'f-foreach-value-as',
	
	        //Used by bind attr handler to keep track of template after first evaluation
	        bindTemplate: 'f-bind-template'
	    }
	};


/***/ },
/* 3 */
/***/ function(module, exports) {

	'use strict';
	
	module.exports = {
	
	    toImplicitType: function (data) {
	        var rbrace = /^(?:\{.*\}|\[.*\])$/;
	        var converted = data;
	        if (typeof data === 'string') {
	            data = data.trim();
	
	            if (data === 'true') {
	                converted = true;
	            } else if (data === 'false') {
	                converted = false;
	            } else if (data === 'null') {
	                converted = null;
	            } else if (data === 'undefined') {
	                converted = '';
	            } else if (converted.charAt(0) === '\'' || converted.charAt(0) === '"') {
	                converted = data.substring(1, data.length - 1);
	            } else if ($.isNumeric(data)) {
	                converted = +data;
	            } else if (rbrace.test(data)) {
	                //TODO: This only works with double quotes, i.e., [1,"2"] works but not [1,'2']
	                converted = JSON.parse(data);
	            }
	        }
	        return converted;
	    }
	};


/***/ },
/* 4 */
/***/ function(module, exports) {

	'use strict';
	
	module.exports = {
	
	    match: function (matchExpr, matchValue, context) {
	        if (_.isString(matchExpr)) {
	            return (matchExpr === '*' || (matchExpr.toLowerCase() === matchValue.toLowerCase()));
	        } else if (_.isFunction(matchExpr)) {
	            return matchExpr(matchValue, context);
	        } else if (_.isRegExp(matchExpr)) {
	            return matchValue.match(matchExpr);
	        }
	    },
	
	    getConvertersList: function ($el, property) {
	        var attrConverters = $el.data('f-convert-' + property);
	        //FIXME: figure out how not to hard-code names here
	        if (!attrConverters && (property === 'bind' || property === 'foreach' || property === 'repeat')) {
	            attrConverters = $el.attr('data-f-convert'); //.data shows value cached by jquery
	            if (!attrConverters) {
	                var $parentEl = $el.closest('[data-f-convert]');
	                if ($parentEl) {
	                    attrConverters = $parentEl.attr('data-f-convert');
	                }
	            }
	            if (attrConverters) {
	                attrConverters = _.invoke(attrConverters.split('|'), 'trim');
	            }
	        }
	
	        return attrConverters;
	    }
	};


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * ## Converter Manager: Make your own Converters
	 *
	 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
	 *
	 * Basic converting and formatting options are built in to Flow.js.
	 *
	 * You can also create your own converters. Each converter should be a function that takes in a value or values to convert. To use your converter, `register()` it in your instance of Flow.js.
	 *
	 */
	
	'use strict';
	
	//TODO: Make all underscore filters available
	
	var normalize = function (alias, converter, acceptList) {
	    var ret = [];
	    //nomalize('flip', fn)
	    if (_.isFunction(converter)) {
	        ret.push({
	            alias: alias,
	            convert: converter,
	            acceptList: acceptList
	        });
	    } else if ($.isPlainObject(converter) && converter.convert) {
	        converter.alias = alias;
	        converter.acceptList = acceptList;
	        ret.push(converter);
	    } else if ($.isPlainObject(alias)) {
	        //normalize({alias: 'flip', convert: function})
	        if (alias.convert) {
	            ret.push(alias);
	        } else {
	            // normalize({flip: fun})
	            $.each(alias, function (key, val) {
	                ret.push({
	                    alias: key,
	                    convert: val,
	                    acceptList: acceptList
	                });
	            });
	        }
	    }
	    return ret;
	};
	
	var matchConverter = function (alias, converter) {
	    if (_.isString(converter.alias)) {
	        return alias === converter.alias;
	    } else if (_.isFunction(converter.alias)) {
	        return converter.alias(alias);
	    } else if (_.isRegex(converter.alias)) {
	        return converter.alias.match(alias);
	    }
	    return false;
	};
	
	var converterManager = {
	    private: {
	        matchConverter: matchConverter
	    },
	
	    list: [],
	    /**
	     * Add a new attribute converter to this instance of Flow.js.
	     *
	     * **Example**
	     *
	     *      Flow.dom.converters.register('max', function (value) {
	     *          return _.max(value);
	     *      }, true);
	     *
	     *      Flow.dom.converters.register({
	     *          alias: 'sig',
	     *          parse: $.noop,
	     *          convert: function (value) {
	     *              return value.firstName + ' ' + value.lastName + ', ' + value.jobTitle;
	     *      }, false);
	     *
	     *      <div>
	     *          The largest sales you had was <span data-f-bind="salesByYear | max | $#,###"></span>.
	     *          The current sales manager is <span data-f-bind="salesMgr | sig"></span>.
	     *      </div>
	     *
	     * @param  {String|Function|Regex} alias Formatter name.
	     * @param  {Function|Object} converter If a function, `converter` is called with the value. If an object, should include fields for `alias` (name), `parse` (function), and `convert` (function).
	     * @param {Boolean} acceptList Determines if the converter is a 'list' converter or not. List converters take in arrays as inputs, others expect single values.
	     * @returns {undefined}
	     */
	    register: function (alias, converter, acceptList) {
	        var normalized = normalize(alias, converter, acceptList);
	        this.list = normalized.concat(this.list);
	    },
	
	    /**
	     * Replace an already registered converter with a new one of the same name.
	     *
	     * @param {String} alias Formatter name.
	     * @param {Function|Object} converter If a function, `converter` is called with the value. If an object, should include fields for `alias` (name), `parse` (function), and `convert` (function).
	     * @returns {undefined}
	     */
	    replace: function (alias, converter) {
	        var index;
	        _.each(this.list, function (currentConverter, i) {
	            if (matchConverter(alias, currentConverter)) {
	                index = i;
	                return false;
	            }
	        });
	        this.list.splice(index, 1, normalize(alias, converter)[0]);
	    },
	
	    getConverter: function (alias) {
	        return _.find(this.list, function (converter) {
	            return matchConverter(alias, converter);
	        });
	    },
	
	    /**
	     * Pipes the value sequentially through a list of provided converters.
	     *
	     * @param  {Any} value Input for the converter to tag.
	     * @param  {Array|Object} list List of converters (maps to converter alias).
	     *
	     * @return {Any} Converted value.
	     */
	    convert: function (value, list) {
	        if (!list || !list.length) {
	            return value;
	        }
	        list = [].concat(list);
	        list = _.invoke(list, 'trim');
	
	        var currentValue = value;
	        var me = this;
	
	        var convertArray = function (converter, val, converterName) {
	            return _.map(val, function (v) {
	                return converter.convert(v, converterName);
	            });
	        };
	        var convert = function (converter, value, converterName) {
	            var converted;
	            if (_.isArray(value) && converter.acceptList !== true) {
	                converted = convertArray(converter, value, converterName);
	            } else {
	                converted = converter.convert(value, converterName);
	            }
	            return converted;
	        };
	        var convertObject = function (converter, value, converterName) {
	            return _.mapValues(value, function (val) {
	                return convert(converter, val, converterName);
	            });
	        };
	        _.each(list, function (converterName) {
	            var converter = me.getConverter(converterName);
	            if (!converter) {
	                throw new Error('Could not find converter for ' + converterName);
	            }
	            if ($.isPlainObject(currentValue) && converter.acceptList !== true) {
	                currentValue = convertObject(converter, currentValue, converterName);
	            } else {
	                currentValue = convert(converter, currentValue, converterName);
	            }
	        });
	        return currentValue;
	    },
	
	    /**
	     * Counter-part to `convert()`. Translates converted values back to their original form.
	     *
	     * @param  {String} value Value to parse.
	     * @param  {String|Array} list  List of parsers to run the value through. Outermost is invoked first.
	     * @return {Any} Original value.
	     */
	    parse: function (value, list) {
	        if (!list || !list.length) {
	            return value;
	        }
	        list = [].concat(list).reverse();
	        list = _.invoke(list, 'trim');
	
	        var currentValue = value;
	        var me = this;
	        _.each(list, function (converterName) {
	            var converter = me.getConverter(converterName);
	            if (converter.parse) {
	                currentValue = converter.parse(currentValue, converterName);
	            }
	        });
	        return currentValue;
	    }
	};
	
	
	//Bootstrap
	var defaultconverters = [
	    __webpack_require__(6),
	    __webpack_require__(7),
	    __webpack_require__(8),
	    __webpack_require__(9),
	    __webpack_require__(10),
	];
	
	$.each(defaultconverters.reverse(), function (index, converter) {
	    if (_.isArray(converter)) {
	        _.each(converter, function (c) {
	            converterManager.register(c);
	        });
	    } else {
	        converterManager.register(converter);
	    }
	});
	
	module.exports = converterManager;


/***/ },
/* 6 */
/***/ function(module, exports) {

	/**
	 * ## Number Converters
	 *
	 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
	 *
	 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
	 *
	 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
	 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
	 *
	 */
	
	'use strict';
	module.exports = {
	    /**
	     * Convert the model variable to an integer. Often used for chaining to another converter.
	     *
	     * **Example**
	     *
	     *      <div>
	     *          Your car has driven
	     *          <span data-f-bind="Odometer | i | s0.0"></span> miles.
	     *      </div>
	     *
	     * @param {Array} value The model variable.
	     */
	    alias: 'i',
	    convert: function (value) {
	        return parseFloat(value, 10);
	    }
	};


/***/ },
/* 7 */
/***/ function(module, exports) {

	/**
	 * ## String Converters
	 *
	 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
	 *
	 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
	 *
	 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
	 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
	 *
	 * For model variables that are strings (or that have been converted to strings), there are several special string formats you can apply.
	 */
	
	'use strict';
	module.exports = {
	
	    /**
	     * Convert the model variable to a string. Often used for chaining to another converter.
	     *
	     * **Example**
	     *
	     *      <div>
	     *          This year you are in charge of sales for
	     *          <span data-f-bind="salesMgr.region | s | upperCase"></span>.
	     *      </div>
	     *
	     * @param {Array} val The model variable.
	     * @returns {String} converted string
	     */
	    s: function (val) {
	        return val + '';
	    },
	
	    /**
	     * Convert the model variable to UPPER CASE.
	     *
	     * **Example**
	     *
	     *      <div>
	     *          This year you are in charge of sales for
	     *          <span data-f-bind="salesMgr.region | s | upperCase"></span>.
	     *      </div>
	     *
	     * @param {Array} val The model variable.
	     * @returns {String} converted string
	     */
	    upperCase: function (val) {
	        return (val + '').toUpperCase();
	    },
	
	    /**
	     * Convert the model variable to lower case.
	     *
	     * **Example**
	     *
	     *      <div>
	     *          Enter your user name:
	     *          <input data-f-bind="userName | lowerCase"></input>.
	     *      </div>
	     *
	     * @param {Array} val The model variable.
	     * @returns {String} converted string
	     */
	    lowerCase: function (val) {
	        return (val + '').toLowerCase();
	    },
	
	    /**
	     * Convert the model variable to Title Case.
	     *
	     * **Example**
	     *
	     *      <div>
	     *          Congratulations on your promotion!
	     *          Your new title is: <span data-f-bind="currentRole | titleCase"></span>.
	     *      </div>
	     *
	     * @param {Array} val The model variable.
	     * @returns {String} converted string
	     */
	    titleCase: function (val) {
	        val = val + '';
	        return val.replace(/\w\S*/g, function (txt) {
	            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
	        });
	    }
	};


/***/ },
/* 8 */
/***/ function(module, exports) {

	/**
	 * ## Array Converters
	 *
	 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
	 *
	 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
	 *
	 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
	 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
	 *
	 * In general, if the model variable is an array, the converter is applied to each element of the array. There are a few built in array converters which, rather than converting all elements of an array, select particular elements from within the array or otherwise treat array variables specially.
	 *
	 */
	
	
	'use strict';
	var list = [
	    {
	        /**
	         * Convert the input into an array. Concatenates all elements of the input.
	         *
	         * @param {Array} val The array model variable.
	         */
	        alias: 'list',
	        acceptList: true,
	        convert: function (val) {
	            return [].concat(val);
	        }
	    },
	    {
	        /**
	         * Select only the last element of the array.
	         *
	         * **Example**
	         *
	         *      <div>
	         *          In the current year, we have <span data-f-bind="Sales | last"></span> in sales.
	         *      </div>
	         *
	         * @param {Array} val The array model variable.
	         */
	        alias: 'last',
	        acceptList: true,
	        convert: function (val) {
	            val = [].concat(val);
	            return val[val.length - 1];
	        }
	    },
	    {
	        /**
	         * Reverse the array.
	         *
	         * **Example**
	         *
	         *      <p>Show the history of our sales, starting with the last (most recent):</p>
	         *      <ul data-f-foreach="Sales | reverse">
	         *          <li></li>
	         *      </ul>
	         *
	         * @param {Array} val The array model variable.
	         */
	        alias: 'reverse',
	        acceptList: true,
	        convert: function (val) {
	            val = [].concat(val);
	            return val.reverse();
	        }
	    },
	    {
	        /**
	         * Select only the first element of the array.
	         *
	         * **Example**
	         *
	         *      <div>
	         *          Our initial investment was <span data-f-bind="Capital | first"></span>.
	         *      </div>
	         *
	         * @param {Array} val The array model variable.
	         */
	        alias: 'first',
	        acceptList: true,
	        convert: function (val) {
	            val = [].concat(val);
	            return val[0];
	        }
	    },
	    {
	        /**
	         * Select only the previous (second to last) element of the array.
	         *
	         * **Example**
	         *
	         *      <div>
	         *          Last year we had <span data-f-bind="Sales | previous"></span> in sales.
	         *      </div>
	         *
	         * @param {Array} val The array model variable.
	         */
	        alias: 'previous',
	        acceptList: true,
	        convert: function (val) {
	            val = [].concat(val);
	            return (val.length <= 1) ? val[0] : val[val.length - 2];
	        }
	    }
	];
	
	_.each(list, function (item) {
	    var oldfn = item.convert;
	    var newfn = function (val) {
	        if ($.isPlainObject(val)) {
	            return _.mapValues(val, oldfn);
	        }
	        return oldfn(val);
	    };
	    item.convert = newfn;
	});
	module.exports = list;


/***/ },
/* 9 */
/***/ function(module, exports) {

	'use strict';
	var list = [];
	
	var supported = [
	    'values', 'keys', 'compact', 'difference',
	    'flatten', 'rest',
	    'union',
	    'uniq', 'without',
	    'xor', 'zip'
	];
	_.each(supported, function (fn) {
	    var item = {
	        alias: fn,
	        acceptList: true,
	        convert: function (val) {
	            if ($.isPlainObject(val)) {
	                return _.mapValues(val, _[fn]);
	            }
	            return _[fn](val);
	        }
	    };
	    list.push(item);
	});
	module.exports = list;


/***/ },
/* 10 */
/***/ function(module, exports) {

	/**
	 * ## Number Format Converters
	 *
	 * Converters allow you to convert data -- in particular, model variables that you display in your project's user interface -- from one form to another.
	 *
	 * There are two ways to specify conversion or formatting for the display output of a particular model variable:
	 *
	 * * Add the attribute `data-f-convert` to any element that also has the `data-f-bind` or `data-f-foreach`.
	 * * Use the `|` (pipe) character within the value of any `data-f-` attribute (not just `data-f-bind` or `data-f-foreach`).
	 *
	 * For model variables that are numbers (or that have been [converted to numbers](../number-converter/)), there are several special number formats you can apply.
	 *
	 * ####Currency Number Format
	 *
	 * After the `|` (pipe) character, use `$` (dollar sign), `0`, and `.` (decimal point) in your converter to describe how currency should appear. The specifications follow the Excel currency formatting conventions.
	 *
	 * **Example**
	 *
	 *      <!-- convert to dollars (include cents) -->
	 *      <input type="text" data-f-bind="price[car]" data-f-convert="$0.00" />
	 *      <input type="text" data-f-bind="price[car] | $0.00" />
	 *
	 *      <!-- convert to dollars (truncate cents) -->
	 *      <input type="text" data-f-bind="price[car]" data-f-convert="$0." />
	 *      <input type="text" data-f-bind="price[car] | $0." />
	 *
	 *
	 * ####Specific Digits Number Format
	 *
	 * After the `|` (pipe) character, use `#` (pound) and `,` (comma) in your converter to describe how the number should appear. The specifications follow the Excel number formatting conventions.
	 *
	 * **Example**
	 *
	 *      <!-- convert to thousands -->
	 *      <input type="text" data-f-bind="sales[car]" data-f-convert="#,###" />
	 *      <input type="text" data-f-bind="sales[car] | #,###" />
	 *
	 *
	 * ####Percentage Number Format
	 *
	 * After the `|` (pipe) character, use `%` (percent) and `0` in your converter to display the number as a percent.
	 *
	 * **Example**
	 *
	 *      <!-- convert to percentage -->
	 *      <input type="text" data-f-bind="profitMargin[car]" data-f-convert="0%" />
	 *      <input type="text" data-f-bind="profitMargin[car] | 0%" />
	 *
	 *
	 * ####Short Number Format
	 *
	 * After the `|` (pipe) character, use `s` and `0` in your converter to describe how the number should appear.
	 *
	 * The `0`s describe the significant digits.
	 *
	 * The `s` describes the "short format," which uses 'K' for thousands, 'M' for millions, 'B' for billions. For example, `2468` converted with `s0.0` displays as `2.5K`.
	 *
	 * **Example**
	 *
	 *      <!-- convert to thousands (show 12,468 as 12.5K) -->
	 *      <span type="text" data-f-bind="price[car] | s0.0"></span>
	 *
	 */
	
	'use strict';
	module.exports = {
	    alias: function (name) {
	        //TODO: Fancy regex to match number formats here
	        return (name.indexOf('#') !== -1 || name.indexOf('0') !== -1);
	    },
	
	    parse: function (val) {
	        val += '';
	        var isNegative = val.charAt(0) === '-';
	
	        val = val.replace(/,/g, '');
	        var floatMatcher = /([-+]?[0-9]*\.?[0-9]+)(K?M?B?%?)/i;
	        var results = floatMatcher.exec(val);
	        var number;
	        var suffix = '';
	        if (results && results[1]) {
	            number = results[1];
	        }
	        if (results && results[2]) {
	            suffix = results[2].toLowerCase();
	        }
	
	        /*eslint no-magic-numbers: 0*/
	        switch (suffix) {
	            case '%':
	                number = number / 100;
	                break;
	            case 'k':
	                number = number * 1000;
	                break;
	            case 'm':
	                number = number * 1000000;
	                break;
	            case 'b':
	                number = number * 1000000000;
	                break;
	            default:
	        }
	        number = parseFloat(number);
	        if (isNegative && number > 0) {
	            number = number * -1;
	        }
	        return number;
	    },
	
	    convert: (function (value) {
	        var scales = ['', 'K', 'M', 'B', 'T'];
	        function roundTo(value, digits) {
	            return Math.round(value * Math.pow(10, digits)) / Math.pow(10, digits);
	        }
	
	        function getDigits(value, digits) {
	            value = value === 0 ? 0 : roundTo(value, Math.max(0, digits - Math.ceil(Math.log(value) / Math.LN10)));
	
	            var TXT = '';
	            var numberTXT = value.toString();
	            var decimalSet = false;
	
	            for (var iTXT = 0; iTXT < numberTXT.length; iTXT++) {
	                TXT += numberTXT.charAt(iTXT);
	                if (numberTXT.charAt(iTXT) === '.') {
	                    decimalSet = true;
	                } else {
	                    digits--;
	                }
	
	                if (digits <= 0) {
	                    return TXT;
	                }
	            }
	
	            if (!decimalSet) {
	                TXT += '.';
	            }
	            while (digits > 0) {
	                TXT += '0';
	                digits--;
	            }
	            return TXT;
	        }
	
	        function addDecimals(value, decimals, minDecimals, hasCommas) {
	            hasCommas = !!hasCommas;
	            var numberTXT = value.toString();
	            var hasDecimals = (numberTXT.split('.').length > 1);
	            var iDec = 0;
	
	            if (hasCommas) {
	                for (var iChar = numberTXT.length - 1; iChar > 0; iChar--) {
	                    if (hasDecimals) {
	                        hasDecimals = (numberTXT.charAt(iChar) !== '.');
	                    } else {
	                        iDec = (iDec + 1) % 3;
	                        if (iDec === 0) {
	                            numberTXT = numberTXT.substr(0, iChar) + ',' + numberTXT.substr(iChar);
	                        }
	                    }
	                }
	
	            }
	            if (decimals > 0) {
	                var toADD;
	                if (numberTXT.split('.').length <= 1) {
	                    toADD = minDecimals;
	                    if (toADD > 0) {
	                        numberTXT += '.';
	                    }
	                } else {
	                    toADD = minDecimals - numberTXT.split('.')[1].length;
	                }
	
	                while (toADD > 0) {
	                    numberTXT += '0';
	                    toADD--;
	                }
	            }
	            return numberTXT;
	        }
	
	        function getSuffix(formatTXT) {
	            formatTXT = formatTXT.replace('.', '');
	            var fixesTXT = formatTXT.split(new RegExp('[0|,|#]+', 'g'));
	            return (fixesTXT.length > 1) ? fixesTXT[1].toString() : '';
	        }
	
	        function isCurrency(string) { // eslint-disable-line
	            var s = $.trim(string);
	
	            if (s === '$' ||
	                s === 'â‚¬' ||
	                s === 'Â¥' ||
	                s === 'Â£' ||
	                s === 'â‚¡' ||
	                s === 'â‚±' ||
	                s === 'KÄ?' ||
	                s === 'kr' ||
	                s === 'Â¢' ||
	                s === 'â‚ª' ||
	                s === 'Æ’' ||
	                s === 'â‚©' ||
	                s === 'â‚«') {
	
	                return true;
	            }
	
	            return false;
	        }
	
	        function format (number, formatTXT) { // eslint-disable-line
	            if (_.isArray(number)) {
	                number = number[number.length - 1];
	            }
	            if (!_.isString(number) && !_.isNumber(number)) {
	                return number;
	            }
	
	            if (!formatTXT || formatTXT.toLowerCase() === 'default') {
	                return number.toString();
	            }
	
	            if (isNaN(number)) {
	                return '?';
	            }
	
	            //var formatTXT;
	            formatTXT = formatTXT.replace('&euro;', 'â‚¬');
	
	            // Divide +/- Number Format
	            var formats = formatTXT.split(';');
	            if (formats.length > 1) {
	                return format(Math.abs(number), formats[((number >= 0) ? 0 : 1)]);
	            }
	
	            // Save Sign
	            var sign = (number >= 0) ? '' : '-';
	            number = Math.abs(number);
	
	
	            var leftOfDecimal = formatTXT;
	            var d = leftOfDecimal.indexOf('.');
	            if (d > -1) {
	                leftOfDecimal = leftOfDecimal.substring(0, d);
	            }
	
	            var normalized = leftOfDecimal.toLowerCase();
	            var index = normalized.lastIndexOf('s');
	            var isShortFormat = index > -1;
	
	            if (isShortFormat) {
	                var nextChar = leftOfDecimal.charAt(index + 1);
	                if (nextChar === ' ') {
	                    isShortFormat = false;
	                }
	            }
	
	            var leadingText = isShortFormat ? formatTXT.substring(0, index) : '';
	            var rightOfPrefix = isShortFormat ? formatTXT.substr(index + 1) : formatTXT.substr(index);
	
	            //first check to make sure 's' is actually short format and not part of some leading text
	            if (isShortFormat) {
	                var shortFormatTest = /[0-9#*]/;
	                var shortFormatTestResult = rightOfPrefix.match(shortFormatTest);
	                if (!shortFormatTestResult || shortFormatTestResult.length === 0) {
	                    //no short format characters so this must be leading text ie. 'weeks '
	                    isShortFormat = false;
	                    leadingText = '';
	                }
	            }
	
	            //if (formatTXT.charAt(0) == 's')
	            if (isShortFormat) {
	                var valScale = number === 0 ? 0 : Math.floor(Math.log(Math.abs(number)) / (3 * Math.LN10));
	                valScale = ((number / Math.pow(10, 3 * valScale)) < 1000) ? valScale : (valScale + 1);
	                valScale = Math.max(valScale, 0);
	                valScale = Math.min(valScale, 4);
	                number = number / Math.pow(10, 3 * valScale);
	                //if (!isNaN(Number(formatTXT.substr(1) ) ) )
	
	                if (!isNaN(Number(rightOfPrefix)) && rightOfPrefix.indexOf('.') === -1) {
	                    var limitDigits = Number(rightOfPrefix);
	                    if (number < Math.pow(10, limitDigits)) {
	                        if (isCurrency(leadingText)) {
	                            return sign + leadingText + getDigits(number, Number(rightOfPrefix)) + scales[valScale];
	                        } else {
	                            return leadingText + sign + getDigits(number, Number(rightOfPrefix)) + scales[valScale];
	                        }
	                    } else if (isCurrency(leadingText)) {
	                        return sign + leadingText + Math.round(number) + scales[valScale];
	                    } else {
	                        return leadingText + sign + Math.round(number) + scales[valScale];
	                    }
	                } else {
	                    //formatTXT = formatTXT.substr(1);
	                    formatTXT = formatTXT.substr(index + 1);
	                    var SUFFIX = getSuffix(formatTXT);
	                    formatTXT = formatTXT.substr(0, formatTXT.length - SUFFIX.length);
	
	                    var valWithoutLeading = format(((sign === '') ? 1 : -1) * number, formatTXT) + scales[valScale] + SUFFIX;
	                    if (isCurrency(leadingText) && sign !== '') {
	                        valWithoutLeading = valWithoutLeading.substr(sign.length);
	                        return sign + leadingText + valWithoutLeading;
	                    }
	
	                    return leadingText + valWithoutLeading;
	                }
	            }
	
	            var subFormats = formatTXT.split('.');
	            var decimals;
	            var minDecimals;
	            if (subFormats.length > 1) {
	                decimals = subFormats[1].length - subFormats[1].replace(new RegExp('[0|#]+', 'g'), '').length;
	                minDecimals = subFormats[1].length - subFormats[1].replace(new RegExp('0+', 'g'), '').length;
	                formatTXT = subFormats[0] + subFormats[1].replace(new RegExp('[0|#]+', 'g'), '');
	            } else {
	                decimals = 0;
	            }
	
	            var fixesTXT = formatTXT.split(new RegExp('[0|,|#]+', 'g'));
	            var preffix = fixesTXT[0].toString();
	            var suffix = (fixesTXT.length > 1) ? fixesTXT[1].toString() : '';
	
	            number = number * ((formatTXT.split('%').length > 1) ? 100 : 1);
	            //            if (formatTXT.indexOf('%') !== -1) number = number * 100;
	            number = roundTo(number, decimals);
	
	            sign = (number === 0) ? '' : sign;
	
	            var hasCommas = (formatTXT.substr(formatTXT.length - 4 - suffix.length, 1) === ',');
	            var formatted = sign + preffix + addDecimals(number, decimals, minDecimals, hasCommas) + suffix;
	
	            //  console.log(originalNumber, originalFormat, formatted)
	            return formatted;
	        }
	
	        return format;
	    }())
	};


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var normalize = function (selector, handler) {
	    if (_.isFunction(handler)) {
	        handler = {
	            handle: handler
	        };
	    }
	    if (!selector) {
	        selector = '*';
	    }
	    handler.selector = selector;
	    return handler;
	};
	
	var match = function (toMatch, node) {
	    if (_.isString(toMatch)) {
	        return toMatch === node.selector;
	    }
	    return $(toMatch).is(node.selector);
	};
	
	var nodeManager = {
	    list: [],
	
	    /**
	     * Add a new node handler
	     * @param  {string} selector jQuery-compatible selector to use to match nodes
	     * @param  {function} handler  Handlers are new-able functions. They will be called with $el as context.? TODO: Think this through
	     * @returns {undefined}
	     */
	    register: function (selector, handler) {
	        this.list.unshift(normalize(selector, handler));
	    },
	
	    getHandler: function (selector) {
	        return _.find(this.list, function (node) {
	            return match(selector, node);
	        });
	    },
	
	    replace: function (selector, handler) {
	        var index;
	        _.each(this.list, function (currentHandler, i) {
	            if (selector === currentHandler.selector) {
	                index = i;
	                return false;
	            }
	        });
	        this.list.splice(index, 1, normalize(selector, handler));
	    }
	};
	
	//bootstraps
	var defaultHandlers = [
	    __webpack_require__(12),
	    __webpack_require__(13),
	    __webpack_require__(14)
	];
	_.each(defaultHandlers.reverse(), function (handler) {
	    nodeManager.register(handler.selector, handler);
	});
	
	module.exports = nodeManager;


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var BaseView = __webpack_require__(13);
	
	module.exports = BaseView.extend({
	
	    propertyHandlers: [
	
	    ],
	
	    getUIValue: function () {
	        var $el = this.$el;
	        //TODO: file a issue for the vensim manager to convert trues to 1s and set this to true and false
	
	        var offVal = (typeof $el.data('f-off') !== 'undefined') ? $el.data('f-off') : 0;
	        //attr = initial value, prop = current value
	        var onVal = (typeof $el.attr('value') !== 'undefined') ? $el.prop('value') : 1;
	
	        var val = ($el.is(':checked')) ? onVal : offVal;
	        return val;
	    },
	    initialize: function () {
	        BaseView.prototype.initialize.apply(this, arguments);
	    }
	}, { selector: ':checkbox,:radio' });


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var config = __webpack_require__(2);
	var BaseView = __webpack_require__(14);
	
	module.exports = BaseView.extend({
	    propertyHandlers: [],
	
	    uiChangeEvent: 'change',
	    getUIValue: function () {
	        return this.$el.val();
	    },
	
	    removeEvents: function () {
	        this.$el.off(this.uiChangeEvent);
	    },
	
	    initialize: function () {
	        var me = this;
	        var propName = this.$el.data(config.binderAttr);
	
	        if (propName) {
	            this.$el.off(this.uiChangeEvent).on(this.uiChangeEvent, function () {
	                var val = me.getUIValue();
	
	                var params = {};
	                params[propName] = val;
	
	                me.$el.trigger(config.events.trigger, params);
	            });
	        }
	        BaseView.prototype.initialize.apply(this, arguments);
	    }
	}, { selector: 'input, select' });


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var BaseView = __webpack_require__(15);
	
	module.exports = BaseView.extend({
	    propertyHandlers: [
	
	    ],
	
	    initialize: function () {
	    }
	}, { selector: '*' });


/***/ },
/* 15 */
/***/ function(module, exports) {

	'use strict';
	
	var extend = function (protoProps, staticProps) {
	    var me = this;
	    var child;
	
	    // The constructor function for the new subclass is either defined by you
	    // (the "constructor" property in your `extend` definition), or defaulted
	    // by us to simply call the parent's constructor.
	    if (protoProps && _.has(protoProps, 'constructor')) {
	        child = protoProps.constructor;
	    } else {
	        child = function () { return me.apply(this, arguments); };
	    }
	
	    // Add static properties to the constructor function, if supplied.
	    _.extend(child, me, staticProps);
	
	    // Set the prototype chain to inherit from `parent`, without calling
	    // `parent`'s constructor function.
	    var Surrogate = function () { this.constructor = child; };
	    Surrogate.prototype = me.prototype;
	    child.prototype = new Surrogate();
	
	    // Add prototype properties (instance properties) to the subclass,
	    // if supplied.
	    if (protoProps) {
	        _.extend(child.prototype, protoProps);
	    }
	
	    // Set a convenience property in case the parent's prototype is needed
	    // later.
	    child.__super__ = me.prototype; //eslint-disable-line no-underscore-dangle
	
	    return child;
	};
	
	var View = function (options) {
	    this.$el = (options.$el) || $(options.el);
	    this.el = options.el;
	    this.initialize.apply(this, arguments);
	
	};
	
	_.extend(View.prototype, {
	    initialize: function () {},
	});
	
	View.extend = extend;
	
	module.exports = View;


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * ## Attribute Manager
	 *
	 * Flow.js provides a set of custom DOM attributes that serve as a data binding between variables and operations in your project's model and HTML elements in your project's user interface. Under the hood, Flow.js is doing automatic conversion of these custom attributes, like `data-f-bind`, into HTML specific to the attribute's assigned value, like the current value of `myModelVar`.
	 *
	 * If you are looking for examples of using particular attributes, see the [specific attributes subpages](../../../../attributes-overview/).
	 *
	 * If you would like to extend Flow.js with your own custom attributes, you can add them to Flow.js using the Attribute Manager.
	 *
	 * The Attribute Manager is specific to adding custom attributes and describing their implementation (handlers). (The [Dom Manager](../../) contains the general implementation.)
	 *
	 *
	 * **Examples**
	 *
	 * Built-in attribute handlers like `data-f-value` and `data-f-foreach` automatically bind variables in your project's model to particular HTML elements. However, your UI may sometimes require displaying only part of the variable (e.g. if it's an object), or "doing something" with the value of the variable, rather than simply displaying it.
	 *
	 * One example of when custom attribute handlers are useful is when your model variable is a complex object and you want to display the fields in a particular way, or you only want to display some of the fields. While the combination of the [`data-f-foreach` attribute](../foreach/default-foreach-attr/) and [templating](../../../../#templates) can help with this, sometimes it's easier to write your own attribute handler. (This is especially true if you will be reusing the attribute handler -- you won't have to copy your templating code over and over.)
	 *
	 *      Flow.dom.attributes.register('showSched', '*', function (sched) {
	 *            // display all the schedule milestones
	 *            // sched is an object, each element is an array
	 *            // of ['Formal Milestone Name', milestoneMonth, completionPercentage]
	 *
	 *            var schedStr = '<ul>';
	 *            var sortedSched = _.sortBy(sched, function(el) { return el[1]; });
	 *
	 *            for (var i = 0; i < sortedSched.length; i++) {
	 *                  schedStr += '<li><strong>' + sortedSched[i][0]
	 *                        + '</strong> currently scheduled for <strong>Month '
	 *                        + sortedSched[i][1] + '</strong></li>';
	 *            }
	 *            schedStr += '</ul>';
	 *
	 *            this.html(schedStr);
	 *      });
	 *
	 * Then, you can use the attribute handler in your HTML just like other Flow.js attributes:
	 *
	 *      <div data-f-showSched="schedule"></div>
	 *
	 */
	
	'use strict';
	
	var defaultHandlers = [
	    __webpack_require__(17),
	    __webpack_require__(18),
	    __webpack_require__(19),
	    __webpack_require__(20),
	    __webpack_require__(21),
	    __webpack_require__(22),
	    __webpack_require__(23),
	    __webpack_require__(24),
	    __webpack_require__(26),
	    __webpack_require__(27),
	    __webpack_require__(28),
	    __webpack_require__(29)
	];
	
	var handlersList = [];
	
	var normalize = function (attributeMatcher, nodeMatcher, handler) {
	    if (!nodeMatcher) {
	        nodeMatcher = '*';
	    }
	    if (_.isFunction(handler)) {
	        handler = {
	            handle: handler
	        };
	    }
	    return $.extend(handler, { test: attributeMatcher, target: nodeMatcher });
	};
	
	$.each(defaultHandlers, function (index, handler) {
	    handlersList.push(normalize(handler.test, handler.target, handler));
	});
	
	
	var matchAttr = function (matchExpr, attr, $el) {
	    var attrMatch;
	
	    if (_.isString(matchExpr)) {
	        attrMatch = (matchExpr === '*' || (matchExpr.toLowerCase() === attr.toLowerCase()));
	    } else if (_.isFunction(matchExpr)) {
	        //TODO: remove element selectors from attributes
	        attrMatch = matchExpr(attr, $el);
	    } else if (_.isRegExp(matchExpr)) {
	        attrMatch = attr.match(matchExpr);
	    }
	    return attrMatch;
	};
	
	var matchNode = function (target, nodeFilter) {
	    return (_.isString(nodeFilter)) ? (nodeFilter === target) : nodeFilter.is(target);
	};
	
	module.exports = {
	    list: handlersList,
	    /**
	     * Add a new attribute handler.
	     *
	     * @param  {String|Function|Regex} attributeMatcher Description of which attributes to match.
	     * @param  {String} nodeMatcher Which nodes to add attributes to. Use [jquery Selector syntax](https://api.jquery.com/category/selectors/).
	     * @param  {Function|Object} handler If `handler` is a function, the function is called with `$element` as context, and attribute value + name. If `handler` is an object, it should include two functions, and have the form: `{ init: fn,  handle: fn }`. The `init` function is called when the page loads; use this to define event handlers. The `handle` function is called with `$element` as context, and attribute value + name.
	     * @returns {undefined}
	     */
	    register: function (attributeMatcher, nodeMatcher, handler) {
	        handlersList.unshift(normalize.apply(null, arguments));
	    },
	
	    /**
	     * Find an attribute matcher matching some criteria.
	     *
	     * @param  {String} attrFilter Attribute to match.
	     * @param  {String|$el} nodeFilter Node to match.
	     *
	     * @return {Array|Null} An array of matching attribute handlers, or null if no matches found.
	     */
	    filter: function (attrFilter, nodeFilter) {
	        var filtered = _.select(handlersList, function (handler) {
	            return matchAttr(handler.test, attrFilter);
	        });
	        if (nodeFilter) {
	            filtered = _.select(filtered, function (handler) {
	                return matchNode(handler.target, nodeFilter);
	            });
	        }
	        return filtered;
	    },
	
	    /**
	     * Replace an existing attribute handler.
	     *
	     * @param  {String} attrFilter Attribute to match.
	     * @param  {String | $el} nodeFilter Node to match.
	     * @param  {Function|Object} handler The updated attribute handler. If `handler` is a function, the function is called with `$element` as context, and attribute value + name. If `handler` is an object, it should include two functions, and have the form: `{ init: fn,  handle: fn }`. The `init` function is called when the page loads; use this to define event handlers. The `handle` function is called with `$element` as context, and attribute value + name.
	     * @returns {undefined}
	     */
	    replace: function (attrFilter, nodeFilter, handler) {
	        var index;
	        _.each(handlersList, function (currentHandler, i) {
	            if (matchAttr(currentHandler.test, attrFilter) && matchNode(currentHandler.target, nodeFilter)) {
	                index = i;
	                return false;
	            }
	        });
	        handlersList.splice(index, 1, normalize(attrFilter, nodeFilter, handler));
	    },
	
	    /**
	     *  Retrieve the appropriate handler for a particular attribute. There may be multiple matching handlers, but the first (most exact) match is always used.
	     *
	     * @param {String} property The attribute.
	     * @param {$el} $el The DOM element.
	     *
	     * @return {Object} The attribute handler.
	     */
	    getHandler: function (property, $el) {
	        var filtered = this.filter(property, $el);
	        //There could be multiple matches, but the top first has the most priority
	        return filtered[0];
	    }
	};
	


/***/ },
/* 17 */
/***/ function(module, exports) {

	/**
	 * ## No-op Attributes
	 *
	 * Flow.js provides special handling for both `data-f-model` (described [here](../../../../#using_in_project)) and `data-f-convert` (described [here](../../../../converter-overview/)). For these attributes, the default behavior is to do nothing, so that this additional special handling can take precendence.
	 *
	 */
	
	'use strict';
	
	// Attributes which are just parameters to others and can just be ignored
	module.exports = {
	
	    target: '*',
	
	    test: /^(?:model|convert)$/i,
	
	    handle: $.noop,
	
	    init: function () {
	        return false;
	    }
	};


/***/ },
/* 18 */
/***/ function(module, exports) {

	/**
	 * ## Call Operation when Element Added to DOM
	 *
	 * Many models call an initialization operation when the [run](../../../../../../glossary/#run) is first created. This is particularly common with [Vensim](../../../../../../model_code/vensim/) models, which need to initialize variables ('startGame') before stepping. You can use the `data-f-on-init` attribute to call an operation from the model when a particular element is added to the DOM.
	 *
	 * #### data-f-on-init
	 *
	 * Add the attribute `data-f-on-init`, and set the value to the name of the operation. To call multiple operations, use the `|` (pipe) character to chain operations. Operations are called serially, in the order listed. Typically you add this attribute to the `<body>` element.
	 *
	 * **Example**
	 *
	 *      <body data-f-on-init="startGame">
	 *
	 *      <body data-f-on-init="startGame | step(3)">
	 *
	 */
	
	'use strict';
	
	module.exports = {
	
	    target: '*',
	
	    test: function (attr, $node) {
	        return (attr.indexOf('on-init') === 0);
	    },
	
	    init: function (attr, value) {
	        attr = attr.replace('on-init', '');
	        var me = this;
	        $(function () {
	            var listOfOperations = _.invoke(value.split('|'), 'trim');
	            listOfOperations = listOfOperations.map(function (value) {
	                var fnName = value.split('(')[0];
	                var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
	                var args = ($.trim(params) !== '') ? params.split(',') : [];
	                return { name: fnName, params: args };
	            });
	
	            //FIXME: this knows too much about the channel
	            me.trigger('f.ui.operate', { operations: listOfOperations, serial: true, options: { readOnly: false } });
	        });
	        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
	    }
	};


/***/ },
/* 19 */
/***/ function(module, exports) {

	/**
	 * ## Call Operation in Response to User Action
	 *
	 * Many models call particular operations in response to end user actions, such as clicking a button or submitting a form.
	 *
	 * #### data-f-on-event
	 *
	 * For any HTML attribute using `on` -- typically on click or on submit -- you can add the attribute `data-f-on-XXX`, and set the value to the name of the operation. To call multiple operations, use the `|` (pipe) character to chain operations. Operations are called serially, in the order listed.
	 *
	 * **Example**
	 *
	 *      <button data-f-on-click="reset">Reset</button>
	 *
	 *      <button data-f-on-click="step(1)">Advance One Step</button>
	 *
	 */
	
	'use strict';
	
	module.exports = {
	
	    target: '*',
	
	    test: function (attr, $node) {
	        return (attr.indexOf('on-') === 0);
	    },
	
	    unbind: function (attr) {
	        attr = attr.replace('on-', '');
	        this.off(attr);
	    },
	
	    init: function (attr, value) {
	        attr = attr.replace('on-', '');
	        var me = this;
	        this.off(attr).on(attr, function () {
	            var listOfOperations = _.invoke(value.split('|'), 'trim');
	            listOfOperations = listOfOperations.map(function (value) {
	                var fnName = value.split('(')[0];
	                var params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
	                var args = ($.trim(params) !== '') ? params.split(',') : [];
	                return { name: fnName, params: args };
	            });
	
	            me.trigger('f.ui.operate', { operations: listOfOperations, serial: true });
	        });
	        return false; //Don't bother binding on this attr. NOTE: Do readonly, true instead?;
	    }
	};


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * ## Display Array and Object Variables: data-f-foreach
	 *
	 * If your model variable is an array, you can reference specific elements of the array using `data-f-bind`: `data-f-bind="sales[3]"` or `data-f-bind="sales[<currentRegion>]"`, as described under [data-f-bind](../../binds/default-bind-attr/).
	 *
	 * However, sometimes you want to loop over *all* of the children of the referenced variable. The `data-f-foreach` attribute allows you to automatically loop over all the 'children' of a referenced variable &mdash; that is, all the elements of an array, or all the fields of an object.
	 *
	 * You can use the `data-f-foreach` attribute to name the variable, then use a combination of templates and aliases to access the index and value of each child for display. (Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).)
	 *
	 * **To display a DOM element based on an array variable from your model:**
	 *
	 * 1. Add the `data-f-foreach` attribute to any HTML element that has repeated sub-elements. The two most common examples are lists and tables. The `data-f-foreach` goes on the enclosing element. For a list, this is the `<ul>`, and for a table, it's the `<tbody>`.
	 * 2. Set the value of the `data-f-foreach` attribute in your top-level HTML element to reference the model array variable. You can do this either with or without introducing an alias to reference the array elements: `<ul data-f-foreach="Time"></ul>` or `<ul data-f-foreach="t in Time"></ul>`.
	 * 3. Add the HTML in which the value of your model array variable should appear. Optionally, inside this inner HTML element, you can use templates (`<%= %>`) to reference the `index` (for arrays) or `key` (for objects) and `value` to display, or to reference the alias you introduced. The `index`, `key`, and `value` are special variables that Flow.js populates for you. 
	 *
	 *
	 * **Examples:**
	 *
	 * **Basic use of data-f-foreach.** Start with an HTML element that has repeated sub-elements. Add the model variable to this HTML element. Then, add the HTML sub-element where your model variable should appear. 
	 *
	 * By default, the `value` of the array element or object field is automatically added to the generated HTML:
	 *
	 *      <!-- the model variable Time is an array of years
	 *          create a list that shows which year -->
	 *
	 *      <ul data-f-foreach="Time">
	 *          <li></li>
	 *      </ul>
	 *
	 * In the third step of the model, this example generates the HTML:
	 *
	 *      <ul data-f-foreach="Time">
	 *            <li>2015</li>
	 *            <li>2016</li>
	 *            <li>2017</li>
	 *      </ul>
	 *
	 * which appears as:
	 *
	 *      * 2015
	 *      * 2016
	 *      * 2017
	 *
	 * **Add templates to reference the index and value.** Optionally, you can use templates (`<%= %>`) to reference the `index` and `value` of the array element to display.
	 *
	 *      <!-- the model variable Time is an array of years
	 *          create a list that shows which year -->
	 *
	 *      <ul data-f-foreach="Time">
	 *          <li> Year <%= index %>: <%= value %> </li>
	 *      </ul>
	 *
	 * In the third step of the model, this example generates:
	 *
	 *      <ul data-f-foreach="Time">
	 *          <li>Year 1: 2015</li>
	 *          <li>Year 2: 2016</li>
	 *          <li>Year 3: 2017</li>
	 *      </ul>
	 *
	 * which appears as:
	 *
	 *      * Year 1: 2015
	 *      * Year 2: 2016
	 *      * Year 3: 2017
	 *
	 *
	 * **Add an alias for the value.** Alternatively, you can add an alias when you initially introduce your model array variable, then reference that alias within templates (`<%= %>`). For example:
	 *
	 *      <ul data-f-foreach="f in Fruits">
	 *          <li> <%= f %> </li>
	 *      </ul>
	 *
	 * which generates:
	 *
	 *      <ul data-f-foreach="f in Fruits">
	 *          <li> apples </li>
	 *          <li> bananas </li>
	 *          <li> cherries </li>
	 *          <li> oranges </li>
	 * 
	 * **Nesting with aliases.** An advantage to introducing aliases is that you can nest HTML elements that have repeated sub-elements. For example:
	 *
	 *      <!-- given Sales, an array whose elements are themselves arrays of the sales for each Region -->
	 *      <ul data-f-foreach="r in Regions">
	 *          <li>Region <%= r %>: 
	 *              <ul data-f-foreach="s in Sales[<%= r %>]">
	 *                  <li>Sales <%= s %></li>
	 *              </ul>
	 *          </li>
	 *      </ul>
	 *
	 * **Logic, data processing.** Finally, note that you can add logic to the display of your data by combining templating with either the `value` or an alias. For example, suppose you only want to display the sales total if it is greater than 250:
	 *
	 *      <table>
	 *          <tbody data-f-foreach="r in regions">
	 *              <tr data-f-foreach="s in sales">
	 *                  <td><%= r + ": " %> <%= (s > 250) ? s : "sales below threshold" %></td>
	 *              </tr>
	 *          </tbody>
	 *      </table>
	 *
	 * (However, if you want to completely hide the table cell for the region if the sales total is too low, you still need to [write your own converter](../../../../../converter-overview).)
	 *
	 * **Notes:**
	 *
	 * * You can use the `data-f-foreach` attribute with both arrays and objects. If the model variable is an object, reference the `key` instead of the `index` in your templates.
	 * * You can use nested `data-f-foreach` attributes to created nested loops of your data. 
	 * * The `data-f-foreach`, whether using aliases or not, goes on the enclosing element. For a list, this is the `<ul>`, and for a table, it's the `<tbody>`.
	 * * The template syntax is to enclose each code fragment (including `index`, `key`, `variable`, or alias) in `<%=` and `%>`. Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).
	 * * The `key`, `index`, and `value` are special variables that Flow.js populates for you. However, they are *no longer available* if you use aliases.
	 * * As with other `data-f-` attributes, you can specify [converters](../../../../../converter-overview) to convert data from one form to another:
	 *
	 *          <ul data-f-foreach="Sales | $x,xxx">
	 *              <li> Year <%= index %>: Sales of <%= value %> </li>
	 *          </ul>
	 *
	 * * The `data-f-foreach` attribute is [similar to the `data-f-repeat` attribute](../../repeat-attr/), so you may want to review the examples there as well.
	 */
	
	'use strict';
	var parseUtils = __webpack_require__(3);
	var config = __webpack_require__(2);
	
	function refToMarkup(refKey) {
	    return '<!--' + refKey + '-->';
	}
	
	module.exports = {
	
	    test: 'foreach',
	
	    target: '*',
	
	    unbind: function (attr) {
	        var template = this.data(config.attrs.foreachTemplate);
	        if (template) {
	            this.html(template);
	            this.removeData(config.attrs.foreachTemplate);
	            this.removeData(config.attrs.keyAs);
	            this.removeData(config.attrs.valueAs);
	        }
	    },
	
	    parse: function (attrVal) {
	        var inMatch = attrVal.match(/(.*) (?:in|of) (.*)/);
	        if (inMatch) {
	            var itMatch = inMatch[1].match(/\((.*),(.*)\)/);
	            if (itMatch) {
	                this.data(config.attrs.keyAs, itMatch[1].trim());
	                this.data(config.attrs.valueAs, itMatch[2].trim());
	            } else {
	                this.data(config.attrs.valueAs, inMatch[1].trim());
	            }
	            attrVal = inMatch[2];
	        }
	        return attrVal;
	    },
	
	    handle: function (value, prop) {
	        value = ($.isPlainObject(value) ? value : [].concat(value));
	        var loopTemplate = this.data(config.attrs.foreachTemplate);
	        if (!loopTemplate) {
	            loopTemplate = this.html();
	            this.data(config.attrs.foreachTemplate, loopTemplate);
	        }
	        var $me = this.empty();
	        var cloop = loopTemplate.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
	
	        var defaultKey = $.isPlainObject(value) ? 'key' : 'index';
	        var keyAttr = $me.data(config.attrs.keyAs) || defaultKey;
	        var valueAttr = $me.data(config.attrs.valueAs) || 'value';
	        
	        var keyRegex = new RegExp('\\b' + keyAttr + '\\b');
	        var valueRegex = new RegExp('\\b' + valueAttr + '\\b');
	
	
	        var closestKnownDataEl = this.closest('[data-current-index]');
	        var knownData = {};
	        if (closestKnownDataEl.length) {
	            knownData = closestKnownDataEl.data('current-index');
	        }
	        var closestParentWithMissing = this.closest('[data-missing-references]');
	        if (closestParentWithMissing.length) { //(grand)parent already stubbed out missing references
	            var missing = closestParentWithMissing.data('missing-references');
	            _.each(missing, function (replacement, template) {
	                if (keyRegex.test(template) || valueRegex.test(template)) {
	                    cloop = cloop.replace(refToMarkup(replacement), template);
	                }
	            });
	        } else {
	            var missingReferences = {};
	            var templateTagsUsed = cloop.match(/<%[=-]?([\s\S]+?)%>/g);
	            if (templateTagsUsed) {
	                templateTagsUsed.forEach(function (tag) {
	                    if (tag.match(/\w+/) && !keyRegex.test(tag) && !valueRegex.test(tag)) {
	                        var refKey = missingReferences[tag];
	                        if (!refKey) {
	                            refKey = _.uniqueId('no-ref');
	                            missingReferences[tag] = refKey;
	                        }
	                        var r = new RegExp(tag, 'g');
	                        cloop = cloop.replace(r, refToMarkup(refKey));
	                    }
	                });
	            }
	            if (_.size(missingReferences)) {
	                //Attr, not data, to make jQ selector easy. No f- prefix to keep this from flow.
	                this.attr('data-missing-references', JSON.stringify(missingReferences));
	            }
	        }
	
	        var templateFn = _.template(cloop);
	        _.each(value, function (dataval, datakey) {
	            if (!dataval) {
	                dataval = dataval + '';
	            }
	            var templateData = {};
	            templateData[keyAttr] = datakey;
	            templateData[valueAttr] = dataval;
	            
	            $.extend(templateData, knownData);
	
	            var nodes;
	            var isTemplated;
	            try {
	                var templatedLoop = templateFn(templateData);
	                isTemplated = templatedLoop !== cloop;
	                nodes = $(templatedLoop);
	            } catch (e) { //you don't have all the references you need;
	                nodes = $(cloop);
	                isTemplated = true;
	                $(nodes).attr('data-current-index', JSON.stringify(templateData));
	            }
	
	            nodes.each(function (i, newNode) {
	                newNode = $(newNode);
	                _.each(newNode.data(), function (val, key) {
	                    newNode.data(key, parseUtils.toImplicitType(val));
	                });
	                if (!isTemplated && !newNode.html().trim()) {
	                    newNode.html(dataval);
	                }
	            });
	            $me.append(nodes);
	            
	        });
	    }
	};


/***/ },
/* 21 */
/***/ function(module, exports) {

	/**
	 * ## Checkboxes and Radio Buttons
	 *
	 * In the [default case](../default-bind-attr/), the `data-f-bind` attribute creates a bi-directional binding between the DOM element and the model variable. This binding is **bi-directional**, meaning that as the model changes, the interface is automatically updated; and when end users change values in the interface, the model is automatically updated.
	 *
	 * Flow.js provides special handling for DOM elements with `type="checkbox"` and `type="radio"`.
	 *
	 * In particular, if you add the `data-f-bind` attribute to an `input` with `type="checkbox"` and `type="radio"`, the checkbox or radio button is automatically selected if the `value` matches the value of the model variable referenced, or if the model variable is `true`.
	 *
	 * **Example**
	 *
	 *      <!-- radio button, selected if sampleInt is 8 -->
	 *      <input type="radio" data-f-bind="sampleInt" value="8" />
	 *
	 *      <!-- checkbox, checked if sampleBool is true -->
	 *      <input type="checkbox" data-f-bind="sampleBool" />
	 *
	 */
	
	'use strict';
	
	module.exports = {
	
	    target: ':checkbox,:radio',
	
	    test: 'bind',
	
	    handle: function (value) {
	        if (_.isArray(value)) {
	            value = value[value.length - 1];
	        }
	        var settableValue = this.attr('value'); //initial value
	        var isChecked = (typeof settableValue !== 'undefined') ? (settableValue == value) : !!value; //eslint-disable-line eqeqeq
	        this.prop('checked', isChecked);
	    }
	};


/***/ },
/* 22 */
/***/ function(module, exports) {

	/**
	 * ## Inputs and Selects
	 *
	 * In the [default case](../default-bind-attr/), the `data-f-bind` attribute creates a bi-directional binding between the DOM element and the model variable. This binding is **bi-directional**, meaning that as the model changes, the interface is automatically updated; and when end users change values in the interface, the model is automatically updated.
	 *
	 * Flow.js provides special handling for DOM elements `input` and `select`.
	 *
	 * In particular, if you add the `data-f-bind` attribute to a `select` or `input` element, the option matching the value of the model variable is automatically selected.
	 *
	 * **Example**
	 *
	 * 		<!-- option selected if sample_int is 8, 10, or 12 -->
	 * 		<select data-f-bind="sample_int">
	 * 			<option value="8"> 8 </option>
	 * 			<option value="10"> 10 </option>
	 * 			<option value="12"> 12 </option>
	 * 		</select>
	 *
	 */
	
	'use strict';
	
	module.exports = {
	    target: 'input, select',
	
	    test: 'bind',
	
	    handle: function (value) {
	        if (_.isArray(value)) {
	            value = value[value.length - 1];
	        }
	        this.val(value);
	    }
	};


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * ## Class Attribute: data-f-class
	 *
	 * You can bind model variables to names of CSS classes, so that you can easily change the styling of HTML elements based on the values of model variables.
	 *
	 * **To bind model variables to CSS classes:**
	 *
	 * 1. Add the `data-f-class` attribute to an HTML element.
	 * 2. Set the value to the name of the model variable.
	 * 3. Optionally, add an additional `class` attribute to the HTML element.
	 *      * If you only use the `data-f-class` attribute, the value of `data-f-class` is the class name.
	 *      * If you *also* add a `class` attribute, the value of `data-f-class` is *appended* to the class name.
	 * 4. Add classes to your CSS code whose names include possible values of that model variable.
	 *
	 * **Example**
	 *
	 *      <style type="text/css">
	 *          .North { color: grey }
	 *          .South { color: purple }
	 *          .East { color: blue }
	 *          .West { color: orange }
	 *          .sales.good { color: green }
	 *          .sales.bad { color: red }
	 *          .sales.value-100 { color: yellow }
	 *       </style>
	 *
	 *       <div data-f-class="salesMgr.region">
	 *           Content colored by region
	 *       </div>
	 *
	 *       <div data-f-class="salesMgr.performance" class="sales">
	 *           Content green if salesMgr.performance is good, red if bad
	 *       </div>
	 *
	 *       <div data-f-class="salesMgr.numRegions" class="sales">
	 *           Content yellow if salesMgr.numRegions is 100
	 *       </div>
	 *
	 */
	
	'use strict';
	var config = __webpack_require__(2);
	
	module.exports = {
	
	    test: 'class',
	
	    target: '*',
	
	    handle: function (value, prop) {
	        if (_.isArray(value)) {
	            value = value[value.length - 1];
	        }
	
	        var addedClasses = this.data(config.classesAdded);
	        if (!addedClasses) {
	            addedClasses = {};
	        }
	        if (addedClasses[prop]) {
	            this.removeClass(addedClasses[prop]);
	        }
	
	        if (_.isNumber(value)) {
	            value = 'value-' + value;
	        }
	        addedClasses[prop] = value;
	        //Fixme: prop is always "class"
	        this.addClass(value);
	        this.data(config.classesAdded, addedClasses);
	    }
	};


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * ## Display Array Variables: data-f-repeat
	 *
	 * The `data-f-repeat` attribute allows you to automatically loop over a referenced variable. The most common use case is in time-based models, like those written in [SimLang](../../../../../model_code/forio_simlang/) or [Vensim](../../../../../model_code/vensim/), when you want to report the value of the variable at every time step so far. The `data-f-repeat` attribute automatically repeats the DOM element it's attached to, filling in the value.
	 *
	 * **To display a DOM element repeatedly based on an array variable from the model:**
	 *
	 * 1. Add the `data-f-repeat` attribute to any HTML element that has repeated sub-elements. The two most common examples are lists and tables.
	 * 2. Set the value of the `data-f-repeat` attribute in the HTML element you want to repeat to the name of the array variable.
	 * 3. Optionally, you can use templates (`<%= %>`) to reference the `index` (for arrays) or `key` (for objects) and `value` to display. The `index`, `key`, and `value` are special variables that Flow.js populates for you.
	 *
	 *
	 * **Examples:**
	 *
	 * For example, to create a table that displays the year and cost for every step of the model that has occurred so far:
	 *
	 *      <table>
	 *          <tr>
	 *              <td>Year</td>
	 *              <td data-f-repeat="Cost[Products]"><%= index + 1 %></td>
	 *          </tr>
	 *          <tr>
	 *              <td>Cost of Products</td>
	 *              <td data-f-repeat="Cost[Products]"></td>
	 *          </tr>
	 *      </table>
	 *
	 * In the third step of the model, this example generates the HTML:
	 *
	 *      <table>
	 *          <tr>
	 *              <td>Year</td>
	 *              <td data-f-repeat="Cost[Products]">1</td>
	 *              <td>2</td>
	 *              <td>3</td>
	 *          </tr>
	 *          <tr>
	 *              <td>Cost of Products</td>
	 *              <td data-f-repeat="Cost[Products]">100</td>
	 *              <td>102</td>
	 *              <td>105</td>
	 *          </tr>
	 *      </table>
	 *
	 * You can also use this with a `<div>` and have the `<div>` itself repeated. For example:
	 *
	 *      <div data-f-repeat="sample_array"></div>
	 *
	 * generates:
	 *
	 *      <div data-f-repeat="sample_array">2</div>
	 *      <div>4</div>
	 *      <div>6</div>
	 *
	 * **Notes:**
	 *
	 * * You can use the `data-f-repeat` attribute with both arrays and objects. If the model variable is an object, reference the `key` instead of the `index` in your templates.
	 * * The `key`, `index`, and `value` are special variables that Flow.js populates for you.
	 * * The template syntax is to enclose each keyword (`index`, `key`, `variable`) in `<%=` and `%>`. Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../#templates).
	 * * In most cases the same effect can be achieved with the [`data-f-foreach` attribute](../../attributes/foreach/default-foreach-attr/), which is similar. In the common use case of a table of data displayed over time, the `data-f-repeat` can be more concise and easier to read. However, the `data-f-foreach` allows aliasing, and so can be more useful especially if you are nesting HTML elements or want to introduce logic about how to display the values.
	 *
	 */
	
	'use strict';
	var parseUtils = __webpack_require__(3);
	var gutils = __webpack_require__(25);
	var config = __webpack_require__(2).attrs;
	module.exports = {
	
	    test: 'repeat',
	
	    target: '*',
	
	    unbind: function (attr) {
	        var id = this.data(config.repeat.templateId);
	        if (id) {
	            this.nextUntil(':not([data-' + id + '])').remove();
	            // this.removeAttr('data-' + config.repeat.templateId);
	        }
	        var loopTemplate = this.data(config.repeat.template);
	        if (loopTemplate) {
	            this.removeData(config.repeat.template);
	            this.replaceWith(loopTemplate);
	        }
	    },
	
	    handle: function (value, prop) {
	        value = ($.isPlainObject(value) ? value : [].concat(value));
	        var loopTemplate = this.data(config.repeat.template);
	        var id = this.data(config.repeat.templateId);
	
	        if (id) {
	            this.nextUntil(':not([data-' + id + '])').remove();
	        } else {
	            id = gutils.random('repeat-');
	            this.data(config.repeat.templateId, id);
	        }
	        if (!loopTemplate) {
	            loopTemplate = this.get(0).outerHTML;
	            this.data(config.repeat.template, loopTemplate);
	        }
	
	        var last;
	        var me = this;
	        _.each(value, function (dataval, datakey) {
	            var cloop = loopTemplate.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
	            var templatedLoop = _.template(cloop, { value: dataval, key: datakey, index: datakey });
	            var isTemplated = templatedLoop !== cloop;
	            var nodes = $(templatedLoop);
	            var hasData = (dataval !== null && dataval !== undefined);
	
	            nodes.each(function (i, newNode) {
	                newNode = $(newNode).removeAttr('data-f-repeat');
	                _.each(newNode.data(), function (val, key) {
	                    if (!last) {
	                        me.data(key, parseUtils.toImplicitType(val));
	                    } else {
	                        newNode.data(key, parseUtils.toImplicitType(val));
	                    }
	                });
	                newNode.attr('data-' + id, true);
	                if (!isTemplated && !newNode.children().length && hasData) {
	                    newNode.html(dataval + '');
	                }
	            });
	            if (!last) {
	                last = me.html(nodes.html());
	            } else {
	                last = nodes.insertAfter(last);
	            }
	        });
	    }
	};


/***/ },
/* 25 */
/***/ function(module, exports) {

	'use strict';
	
	module.exports = {
	    random: function (prefix, min, max) {
	        if (!min) {
	            min = parseInt(_.uniqueId(), 10);
	        }
	        if (!max) {
	            max = 100000; //eslint-disable-line no-magic-numbers
	        }
	        var number = _.random(min, max, false) + '';
	        if (prefix) {
	            number = prefix + number;
	        }
	        return number;
	    }
	};


/***/ },
/* 26 */
/***/ function(module, exports) {

	/**
	 * ## Binding for data-f-[boolean]
	 *
	 * Flow.js provides special handling for HTML attributes that take Boolean values.
	 *
	 * In particular, for most HTML attributes that expect Boolean values, the attribute is directly set to the value of the model variable. This is true for `checked`, `selected`, `async`, `autofocus`, `autoplay`, `controls`, `defer`, `ismap`, `loop`, `multiple`, `open`, `required`, and `scoped`.
	 *
	 * However, there are a few notable exceptions. For the HTML attributes `disabled`, `hidden`, and `readonly`, the attribute is set to the *opposite* of the value of the model variable. This makes the resulting HTML easier to read.
	 *
	 * **Example**
	 *
	 *      <!-- this checkbox is CHECKED when sampleBool is TRUE,
	 *           and UNCHECKED when sampleBool is FALSE -->
	 *      <input type="checkbox" data-f-checked="sampleBool" />
	 *
	 *      <!-- this button is ENABLED when sampleBool is TRUE,
	 *           and DISABLED when sampleBool is FALSE -->
	 *      <button data-f-disabled="sampleBool">Click Me</button>
	 *
	 */
	
	'use strict';
	
	module.exports = {
	    target: '*',
	
	    test: /^(?:checked|selected|async|autofocus|autoplay|controls|defer|ismap|loop|multiple|open|required|scoped)$/i,
	
	    handle: function (value, prop) {
	        if (_.isArray(value)) {
	            value = value[value.length - 1];
	        }
	        var val = (this.attr('value')) ? (value == this.prop('value')) : !!value; //eslint-disable-line eqeqeq
	        this.prop(prop, val);
	    }
	};


/***/ },
/* 27 */
/***/ function(module, exports) {

	/**
	 * ## Binding for data-f-[boolean]
	 *
	 * Flow.js provides special handling for HTML attributes that take Boolean values.
	 *
	 * In particular, for most HTML attributes that expect Boolean values, the attribute is directly set to the value of the model variable. This is true for `checked`, `selected`, `async`, `autofocus`, `autoplay`, `controls`, `defer`, `ismap`, `loop`, `multiple`, `open`, `required`, and `scoped`.
	 *
	 * However, there are a few notable exceptions. For the HTML attributes `disabled`, `hidden`, and `readonly`, the attribute is set to the *opposite* of the value of the model variable. This makes the resulting HTML easier to read.
	 *
	 * **Example**
	 *
	 *      <!-- this checkbox is CHECKED when sampleBool is TRUE,
	 *           and UNCHECKED when sampleBool is FALSE -->
	 *      <input type="checkbox" data-f-checked="sampleBool" />
	 *
	 *      <!-- this button is ENABLED when sampleBool is TRUE,
	 *           and DISABLED when sampleBool is FALSE -->
	 *      <button data-f-disabled="sampleBool">Click Me</button>
	 *
	 */
	
	'use strict';
	
	module.exports = {
	
	    target: '*',
	
	    test: /^(?:disabled|hidden|readonly)$/i,
	
	    handle: function (value, prop) {
	        if (_.isArray(value)) {
	            value = value[value.length - 1];
	        }
	        this.prop(prop, !value);
	    }
	};


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * ## Default Bi-directional Binding: data-f-bind
	 *
	 * The most commonly used attribute provided by Flow.js is the `data-f-bind` attribute.
	 *
	 * #### data-f-bind with a single value
	 *
	 * You can bind variables from the model in your interface by setting the `data-f-bind` attribute. This attribute binding is bi-directional, meaning that as the model changes, the interface is automatically updated; and when users change values in the interface, the model is automatically updated. Specifically:
	 *
	 * * The binding from the model to the interface ensures that the current value of the variable is displayed in the HTML element. This includes automatic updates to the displayed value if something else changes in the model.
	 *
	 * * The binding from the interface to the model ensures that if the HTML element is editable, changes are sent to the model.
	 *
	 * Once you set `data-f-bind`, Flow.js figures out the appropriate action to take based on the element type and the data response from your model.
	 *
	 * **To display and automatically update a variable in the interface:**
	 *
	 * 1. Add the `data-f-bind` attribute to any HTML element that normally takes a value.
	 * 2. Set the value of the `data-f-bind` attribute to the name of the variable.
	 *
	 * **Example**
	 *
	 *      <span data-f-bind="salesManager.name" />
	 *
	 *      <input type="text" data-f-bind="sampleString" />
	 *
	 * **Notes:**
	 *
	 * * Use square brackets, `[]`, to reference arrayed variables: `sales[West]`.
	 * * Use angle brackets, `<>`, to reference other variables in your array index: `sales[<currentRegion>]`.
	 * * Remember that if your model is in Vensim, the time step is the last array index.
	 * * By default, all HTML elements update for any change for each variable. However, you can prevent the user interface from updating &mdash; either for all variables or for particular variables &mdash; by setting the `silent` property when you initialize Flow.js. See more on [additional options for the Flow.initialize() method](../../../../../#custom-initialize).
	 *
	 * #### data-f-bind with multiple values and templates
	 *
	 * If you have multiple variables, you can use the shortcut of listing multiple variables in an enclosing HTML element and then referencing each variable using templates. (Templates are available as part of Flow.js's lodash dependency. See more background on [working with templates](../../../../../#templates).)
	 *
	 * **To display and automatically update multiple variables in the interface:**
	 *
	 * 1. Add the `data-f-bind` attribute to any HTML element from which you want to reference model variables, such as a `div` or `table`.
	 * 2. Set the value of the `data-f-bind` attribute in your top-level HTML element to a comma-separated list of the variables. (The variables may or may not be case-sensitive, depending on your modeling language.)
	 *
	 * 3. Inside the HTML element, use templates (`<%= %>`) to reference the specific variable names. These variable names are case-sensitive: they should match the case you used in the `data-f-bind` in step 2.
	 *
	 * **Example**
	 *
	 *      <!-- make these three model variables available throughout div -->
	 *
	 *      <div data-f-bind="CurrentYear, Revenue, Profit">
	 *          In <%= CurrentYear %>,
	 *          our company earned <%= Revenue %>,
	 *          resulting in <%= Profit %> profit.
	 *      </div>
	 *
	 * This example is shorthand for repeatedly using data-f-bind. For instance, this code also generates the same output:
	 *
	 *      <div>
	 *          In <span data-f-bind="CurrentYear"></span>,
	 *          our company earned <span data-f-bind="Revenue"></span>,
	 *          resulting in <span data-f-bind="Profit"> profit</span>.
	 *      </div>
	 *
	 * **Notes:**
	 *
	 * * Adding `data-f-bind` to the enclosing HTML element rather than repeatedly using it within the element is a code style preference. In many cases, adding `data-f-bind` at the top level, as in the first example, can make your code easier to read and maintain.
	 * * However, you might choose to repeatedly use `data-f-bind` in some cases, for example if you want different [formatting](../../../../../converter-overview/) for different variables:
	 *
	 *          <div>
	 *              In <span data-f-bind="CurrentYear | #"></span>,
	 *              our company earned <span data-f-bind="Revenue | $#,###"></span>
	 *          </div>
	 *
	 * * Because everything within your template (`<%= %>`) is evaluated as JavaScript, you can use templates to pass expressions to other Flow.js attributes. For example,
	 *
	 *          <div data-f-bind="myCurrentTimeStep">
	 *              <div data-f-bind="Revenue[<%= value + 1%>]"></div>
	 *          </div>
	 *
	 * will display the value of `Revenue[myCurrentTimeStep + 1]` (for example an estimate of future revenue in your model).
	 *
	 */
	
	'use strict';
	var config = __webpack_require__(2);
	
	module.exports = {
	
	    target: '*',
	
	    test: 'bind',
	
	    unbind: function (attr) {
	        var template = this.data(config.attrs.bindTemplate);
	        if (template) {
	            this.html(template);
	        }
	    },
	
	    handle: function (value) {
	        var templated;
	        var valueToTemplate = $.extend({}, value);
	        if (!$.isPlainObject(value)) {
	            var variableName = this.data('f-bind');//Hack because i don't have access to variable name here otherwise
	            valueToTemplate = { value: value };
	            valueToTemplate[variableName] = value;
	        } else {
	            valueToTemplate.value = value; //If the key has 'weird' characters like '<>' hard to get at with a template otherwise
	        }
	        var bindTemplate = this.data(config.attrs.bindTemplate);
	        if (bindTemplate) {
	            templated = _.template(bindTemplate, valueToTemplate);
	            this.html(templated);
	        } else {
	            var oldHTML = this.html();
	            var cleanedHTML = oldHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
	            templated = _.template(cleanedHTML, valueToTemplate);
	            if (cleanedHTML === templated) { //templating did nothing
	                if (_.isArray(value)) {
	                    value = value[value.length - 1];
	                }
	                value = ($.isPlainObject(value)) ? JSON.stringify(value) : value + '';
	                this.html(value);
	            } else {
	                this.data(config.attrs.bindTemplate, cleanedHTML);
	                this.html(templated);
	            }
	        }
	    }
	};


/***/ },
/* 29 */
/***/ function(module, exports) {

	/**
	 * ## Default Attribute Handling: Read-only Binding
	 *
	 * Flow.js uses the HTML5 convention of prepending data- to any custom HTML attribute. Flow.js also adds `f` for easy identification of Flow.js. For example, Flow.js provides several custom attributes and attribute handlers -- including [data-f-bind](../binds/default-bind-attr), [data-f-foreach](../foreach/default-foreach-attr/), [data-f-on-init](../events/init-event-attr/), etc. You can also [add your own attribute handlers](../attribute-manager/).
	 *
	 * The default behavior for handling a known attribute is to use the value of the model variable as the value of the attribute. (There are exceptions for some [boolean attributes](../boolean-attr/).)
	 *
	 * This means you can bind variables from the model in your interface by adding the `data-f-` prefix to any standard DOM attribute. This attribute binding is **read-only**, so as the model changes, the interface is automatically updated; but when users change values in the interface, no action occurs.
	 *
	 * **To display a DOM element based on a variable from the model:**
	 *
	 * 1. Add the prefix `data-f-` to any attribute in any HTML element that normally takes a value.
	 * 2. Set the value of the attribute to the name of the model variable.
	 *
	 * **Example**
	 *
	 * 		<!-- input element displays value of sample_int, however,
	 * 			no call to the model is made if user changes sample_int
	 *
	 *			if sample_int is 8, this is the equivalent of <input value="8"></input> -->
	 *
	 *		<input data-f-value="sample_int"></input>
	 *
	 */
	
	'use strict';
	
	module.exports = {
	
	    test: '*',
	
	    target: '*',
	
	    handle: function (value, prop) {
	        this.prop(prop, value);
	    }
	};


/***/ },
/* 30 */
/***/ function(module, exports) {

	'use strict';
	
	module.exports = function (target, domManager) {
	    if (!window.MutationObserver) {
	        return false;
	    }
	
	    // Create an observer instance
	    var observer = new MutationObserver(function (mutations) {
	        mutations.forEach(function (mutation) {
	            var added = $(mutation.addedNodes).find(':f');
	            added = added.add($(mutation.addedNodes).filter(':f'));
	
	            var removed = $(mutation.removedNodes).find(':f');
	            removed = removed.add($(mutation.removedNodes).filter(':f'));
	
	            if (added && added.length) {
	                // console.log('mutation observer added', added.get(), mutation.addedNodes);
	                domManager.bindAll(added);
	            }
	            if (removed && removed.length) {
	                // console.log('mutation observer removed', removed);
	                domManager.unbindAll(removed);
	            }
	        });
	    });
	
	    var mutconfig = {
	        attributes: false,
	        childList: true,
	        subtree: true,
	        characterData: false
	    };
	    observer.observe(target, mutconfig);
	    // Later, you can stop observing
	    // observer.disconnect();
	};


/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var VarsChannel = __webpack_require__(32);
	var OperationsChannel = __webpack_require__(33);
	
	module.exports = function (options) {
	    var defaults = {
	        run: {
	            variables: {
	
	            },
	            operations: {
	
	            }
	        }
	    };
	    var config = $.extend(true, {}, defaults, options);
	
	    var rm = new window.F.manager.RunManager(config);
	    var rs = rm.run;
	
	    var $creationPromise = rm.getRun();
	    rs.currentPromise = $creationPromise;
	
	    // $creationPromise
	    //     .then(function () {
	    //         console.log('done');
	    //     })
	    //     .fail(function () {
	    //         console.log('failt');
	    //     });
	
	    var createAndThen = function (fn, context) {
	        return _.wrap(fn, function (func) {
	            var passedInParams = _.toArray(arguments).slice(1);
	            return rs.currentPromise.then(function () {
	                rs.currentPromise = func.apply(context, passedInParams);
	                return rs.currentPromise;
	            }).fail(function () {
	                console.warn('This failed, but we\'re moving ahead with the next one anyway', arguments);
	                rs.currentPromise = func.apply(context, passedInParams);
	                return rs.currentPromise;
	            });
	        });
	    };
	
	    //Make sure nothing happens before the run is created
	    var nonWrapped = ['variables', 'create', 'load', 'getCurrentConfig', 'updateConfig'];
	    _.each(rs, function (value, name) {
	        if (_.isFunction(value) && !_.contains(nonWrapped, name)) {
	            rs[name] = createAndThen(value, rs);
	        }
	    });
	
	    var originalVariablesFn = rs.variables;
	    rs.variables = function () {
	        var vs = originalVariablesFn.apply(rs, arguments);
	        _.each(vs, function (value, name) {
	            if (_.isFunction(value)) {
	                vs[name] = createAndThen(value, vs);
	            }
	        });
	        return vs;
	    };
	
	    this.run = rs;
	    this.variables = new VarsChannel($.extend(true, {}, config.run.variables, { run: rs }));
	    this.operations = new OperationsChannel($.extend(true, {}, config.run.operations, { run: rs }));
	
	    var me = this;
	    var DEBOUNCE_INTERVAL = 200;
	    var debouncedRefresh = _.debounce(function () {
	        me.variables.refresh(null, true);
	        if (me.variables.options.autoFetch.enable) {
	            me.variables.startAutoFetch();
	        }
	    }, DEBOUNCE_INTERVAL, { leading: false });
	
	    this.operations.subscribe('*', debouncedRefresh);
	};


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * ## Variables Channel
	 *
	 * Channels are ways for Flow.js to talk to external APIs -- primarily the [underlying Epicenter APIs](../../../../creating_your_interface/).
	 *
	 * The primary use cases for the Variables Channel are:
	 *
	 * * `publish`: Update a model variable.
	 * * `subscribe`: Receive notifications when a model variable is updated.
	 *
	 * For example, use `publish()` to update a model variable:
	 *
	 *      Flow.channel.operations.publish('myVariable', newValue);
	 *
	 * For reference, an equivalent call using Flow.js custom HTML attributes is:
	 *
	 *      <input type="text" data-f-bind="myVariable" value="newValue"></input>
	 *
	 * where the new value is input by the user.
	 *
	 * You can also use `subscribe()` and a callback function to listen and react when the model variable has been updated:
	 *
	 *      Flow.channel.operations.subscribe('myVariable',
	 *          function() { console.log('called!'); } );
	 *
	 * To use the Variables Channel, simply [initialize Flow.js in your project](../../../#custom-initialize).
	 *
	*/
	
	'use strict';
	var config = __webpack_require__(2);
	
	
	module.exports = function (options) {
	    var defaults = {
	        /**
	         * Determine when to update state. Defaults to `false`: always trigger updates.
	         *
	         * Possible options are:
	         *
	         * * `true`: Never trigger any updates. Use this if you know your model state won't change based on other variables.
	         * * `false`: Always trigger updates.
	         * * `[array of variable names]`: Variables in this array *will not* trigger updates; everything else will.
	         * * `{ except: [array of variable names] }`: Variables in this array *will* trigger updates; nothing else will.
	         *
	         * To set, pass this into the `Flow.initialize()` call in the `channel.run.variables` field:
	         *
	         *      Flow.initialize({
	         *          channel: {
	         *              run: {
	         *                  model: 'myModel.py',
	         *                  account: 'acme-simulations',
	         *                  project: 'supply-chain-game',
	         *                  variables: { silent: true }
	         *              }
	         *          }
	         *      });
	         *
	         * To override for a specific call to the Variables Channel, pass this as the final `options` parameter:
	         *
	         *       Flow.channel.variables.publish('myVariable', newValue, { silent: true });
	         *
	         * @type {String|Array|Object}
	         */
	        silent: false,
	
	        /**
	         * Allows you to automatically fetch variables from the API as they're being subscribed. If this is set to `enable: false` you'll need to explicitly call `refresh()` to get data and notify your listeners.
	         *
	         * The properties of this object include:
	         *
	         * * `autoFetch.enable` *Boolean* Enable auto-fetch behavior. If set to `false` during instantiation there's no way to enable this again. Defaults to `true`.
	         * * `autoFetch.start` *Boolean* If auto-fetch is enabled, control when to start fetching. Typically you'd want to start right away, but if you want to wait till something else happens (like an operation or user action) set to `false` and control using the `startAutoFetch()` function. Defaults to `true`.
	         * * `autoFetch.debounce` *Number* Milliseconds to wait between calls to `subscribe()` before calling `fetch()`. See [http://drupalmotion.com/article/debounce-and-throttle-visual-explanation](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation) for an explanation of how debouncing works. Defaults to `200`.
	         *
	         * @type {Object}
	         */
	        autoFetch: {
	
	             // Enable auto-fetch behavior. If set to `false` during instantiation there's no way to enable this again
	             // @type {Boolean}
	            enable: true,
	
	             // If auto-fetch is enabled, control when to start fetching. Typically you'd want to start right away, but if you want to wait till something else happens (like an operation or user action) set to `false` and control using the `startAutoFetch()` function.
	             // @type {Boolean}
	            start: true,
	
	             // Control time to wait between calls to `subscribe()` before calling `fetch()`. See [http://drupalmotion.com/article/debounce-and-throttle-visual-explanation](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation) for an explanation of how debouncing works.
	             // @type {Number} Milliseconds to wait
	            debounce: 200
	        },
	
	        /**
	         * Allow using the channel for reading data (subscribing), but disallow calls to `publish`. Defaults to `false`: allow both subscribing and publishing. If a function is provided, the function should return a Boolean value to override.
	         * @type {Boolean | Function}
	         */
	        readOnly: false,
	
	        interpolate: {}
	    };
	
	    var channelOptions = $.extend(true, {}, defaults, options);
	    this.options = channelOptions;
	
	    var vs = channelOptions.run.variables();
	
	    var currentData = {};
	
	    //TODO: actually compare objects and so on
	    var isEqual = function () {
	        return false;
	    };
	
	    var getInnerVariables = function (str) {
	        var inner = str.match(/<(.*?)>/g);
	        inner = _.map(inner, function (val) {
	            return val.substring(1, val.length - 1);
	        });
	        return inner;
	    };
	
	    //TODO: Move this check into epijs
	    var queryVars = function (vList) {
	        vList = _.invoke(vList, 'trim');
	        vList = _.filter(vList, function (val) {
	            return val && val !== '';
	        });
	        return vs.query(vList);
	    };
	
	    //Replaces stubbed out keynames in variablestointerpolate with their corresponding values
	    var interpolate = function (variablesToInterpolate, values) {
	        //{price[1]: price[<time>]}
	        var interpolationMap = {};
	        //{price[1]: 1}
	        var interpolated = {};
	
	        _.each(variablesToInterpolate, function (outerVariable) {
	            var inner = getInnerVariables(outerVariable);
	            var originalOuter = outerVariable;
	            if (inner && inner.length) {
	                $.each(inner, function (index, innerVariable) {
	                    var thisval = values[innerVariable];
	                    if (thisval !== null && (typeof thisval !== 'undefined')) {
	                        if (_.isArray(thisval)) {
	                            //For arrayed things get the last one for interpolation purposes
	                            thisval = thisval[thisval.length - 1];
	                        }
	                        //TODO: Regex to match spaces and so on
	                        outerVariable = outerVariable.replace('<' + innerVariable + '>', thisval);
	                    }
	                });
	                interpolationMap[outerVariable] = (interpolationMap[outerVariable]) ? [originalOuter].concat(interpolationMap[outerVariable]) : originalOuter;
	            }
	            interpolated[originalOuter] = outerVariable;
	        });
	
	        var op = {
	            interpolated: interpolated,
	            interpolationMap: interpolationMap
	        };
	        return op;
	    };
	
	    var publicAPI = {
	        //for testing
	        private: {
	            getInnerVariables: getInnerVariables,
	            interpolate: interpolate,
	            currentData: currentData,
	            options: channelOptions
	        },
	
	        subscriptions: [],
	
	        unfetched: [],
	
	        getSubscribers: function (topic) {
	            if (topic) {
	                return _.filter(this.subscriptions, function (subs) {
	                    return _.contains(subs.topics, topic);
	                });
	            }
	            return this.subscriptions;
	        },
	        getAllTopics: function () {
	            return _(this.subscriptions).pluck('topics').flatten().uniq().value();
	        },
	        getTopicDependencies: function (list) {
	            if (!list) {
	                list = this.getAllTopics();
	            }
	            var innerList = [];
	            _.each(list, function (vname) {
	                var inner = getInnerVariables(vname);
	                if (inner.length) {
	                    innerList = _.uniq(innerList.concat(inner));
	                }
	            });
	            return innerList;
	        },
	
	        updateAndCheckForRefresh: function (topics, options) {
	            if (topics) {
	                this.unfetched = _.uniq(this.unfetched.concat(topics));
	            }
	            if (!channelOptions.autoFetch.enable || !channelOptions.autoFetch.start || !this.unfetched.length) {
	                return false;
	            }
	            if (!this.debouncedFetch) {
	                var DELAY_FACTOR = 4;
	                var debounceOptions = $.extend(true, {}, {
	                    maxWait: channelOptions.autoFetch.debounce * DELAY_FACTOR,
	                    leading: false
	                }, options);
	
	                this.debouncedFetch = _.debounce(function () {
	                    this.fetch(this.unfetched).then(function (changed) {
	                        $.extend(currentData, changed);
	                        this.unfetched = [];
	                        this.notify(changed);
	                    }.bind(this));
	                }, channelOptions.autoFetch.debounce, debounceOptions);
	            }
	
	            this.debouncedFetch(topics);
	        },
	
	        populateInnerVariables: function (vars) {
	            var unmappedVariables = [];
	            var valueList = {};
	            _.each(vars, function (v) {
	                if (typeof this.options.interpolate[v] !== 'undefined') {
	                    var val = _.isFunction(this.options.interpolate[v]) ? this.options.interpolate[v](v) : this.options.interpolate[v];
	                    valueList[v] = val;
	                } else {
	                    unmappedVariables.push(v);
	                }
	            }, this);
	            if (unmappedVariables.length) {
	                return queryVars(unmappedVariables).then(function (variableValueList) {
	                    return $.extend(valueList, variableValueList);
	                });
	            }
	            return $.Deferred().resolve(valueList).promise();
	        },
	
	        fetch: function (variablesList) {
	            // console.log('fetch called', variablesList);
	            variablesList = [].concat(variablesList);
	            if (!variablesList.length) {
	                return $.Deferred().resolve().promise({});
	            }
	            var innerVariables = this.getTopicDependencies(variablesList);
	            var getVariables = function (vars, interpolationMap) {
	                return queryVars(vars).then(function (variables) {
	                    // console.log('Got variables', variables);
	                    var changeSet = {};
	                    _.each(variables, function (value, vname) {
	                        var oldValue = currentData[vname];
	                        if (!isEqual(value, oldValue)) {
	                            changeSet[vname] = value;
	                            if (interpolationMap && interpolationMap[vname]) {
	                                var map = [].concat(interpolationMap[vname]);
	                                _.each(map, function (interpolatedName) {
	                                    changeSet[interpolatedName] = value;
	                                });
	                            }
	                        }
	                    });
	                    return changeSet;
	                });
	            };
	            if (innerVariables.length) {
	                return this.populateInnerVariables(innerVariables).then(function (innerVariables) {
	                    //console.log('inner', innerVariables);
	                    $.extend(currentData, innerVariables);
	                    var ip = interpolate(variablesList, innerVariables);
	                    return getVariables(_.values(ip.interpolated), ip.interpolationMap);
	                });
	            }
	            return getVariables(variablesList);
	        },
	
	        startAutoFetch: function () {
	            channelOptions.autoFetch.start = true;
	            this.updateAndCheckForRefresh();
	        },
	
	        stopAutoFetch: function () {
	            channelOptions.autoFetch.start = false;
	        },
	
	        /**
	         * Force a check for updates on the channel, and notify all listeners.
	         *
	         * @param {Object|Array} changeList Key-value pairs of changed variables.
	         * @param {Boolean} force  Ignore all `silent` options and force refresh.
	         * @param {Object} options (Optional) Overrides for the default channel options.
	         * @returns {promise} Promise on completion
	         */
	        refresh: function (changeList, force, options) {
	            var opts = $.extend(true, {}, channelOptions, options);
	            var me = this;
	            var silent = opts.silent;
	            var changedVariables = _.isArray(changeList) ? changeList : _.keys(changeList);
	
	            var shouldSilence = silent === true;
	            if (_.isArray(silent) && changedVariables) {
	                shouldSilence = _.intersection(silent, changedVariables).length >= 1;
	            }
	            if ($.isPlainObject(silent) && changedVariables) {
	                shouldSilence = _.intersection(silent.except, changedVariables).length !== changedVariables.length;
	            }
	
	            if (shouldSilence && force !== true) {
	                return $.Deferred().resolve().promise();
	            }
	
	            var variables = this.getAllTopics();
	            me.unfetched = [];
	
	            return this.fetch(variables).then(function (changeSet) {
	                $.extend(currentData, changeSet);
	                me.notify(changeSet);
	            });
	        },
	
	        /**
	         * Alert each subscriber about the variable and its new value.
	         *
	         * **Example**
	         *
	         *      Flow.channel.operations.notify('myVariable', newValue);
	         *
	         * @param {String|Array} topics Names of variables.
	         * @param {String|Number|Array|Object} value New values for the variables.
	         * @returns {undefined}
	        */
	        notify: function (topics, value) {
	            var callTarget = function (target, params) {
	                if (_.isFunction(target)) {
	                    target(params);
	                } else {
	                    target.trigger(config.events.channelDataReceived, params);
	                }
	            };
	
	            if (!$.isPlainObject(topics)) {
	                topics = _.object([topics], [value]);
	            }
	            _.each(this.subscriptions, function (subscription) {
	                var target = subscription.target;
	                if (subscription.batch) {
	                    var matchingTopics = _.pick(topics, subscription.topics);
	                    if (_.size(matchingTopics) === _.size(subscription.topics)) {
	                        callTarget(target, matchingTopics);
	                    }
	                } else {
	                    _.each(subscription.topics, function (topic) {
	                        var matchingTopics = _.pick(topics, topic);
	                        if (_.size(matchingTopics)) {
	                            callTarget(target, matchingTopics);
	                        }
	                    });
	                }
	            });
	        },
	
	        /**
	         * Update the variables with new values, and alert subscribers.
	         *
	         * **Example**
	         *
	         *      Flow.channel.variables.publish('myVariable', newValue);
	         *      Flow.channel.variables.publish({ myVar1: newVal1, myVar2: newVal2 });
	         *
	         * @param  {String|Object} variable String with name of variable. Alternatively, object in form `{ variableName: value }`.
	         * @param {String|Number|Array|Object} value (Optional)  Value of the variable, if previous argument was a string.
	         * @param {Object} options (Optional) Overrides for the default channel options. Supported options: `{ silent: Boolean }` and `{ batch: Boolean }`.
	         *
	         * @return {$promise} Promise to complete the update.
	         */
	        publish: function (variable, value, options) {
	            // console.log('publish', arguments);
	            var attrs;
	            if ($.isPlainObject(variable)) {
	                attrs = variable;
	                options = value;
	            } else {
	                (attrs = {})[variable] = value;
	            }
	
	            var opts = $.extend(true, {}, channelOptions, options);
	
	            if (_.result(opts, 'readOnly')) {
	                console.warn('Tried to publish to a read-only channel', variable);
	                return $.Deferred().reject().promise();
	            }
	            var it = interpolate(_.keys(attrs), currentData);
	
	            var toSave = {};
	            _.each(attrs, function (val, attr) {
	                var key = (it.interpolated[attr]) ? it.interpolated[attr] : attr;
	                toSave[key] = val;
	            });
	            var me = this;
	            return vs.save(toSave).then(function () {
	                return me.refresh(attrs, null, opts);
	            });
	        },
	
	        /**
	         * Subscribe to changes on a channel: Ask for notification when variables are updated.
	         *
	         * **Example**
	         *
	         *      Flow.channel.variables.subscribe('myVariable',
	         *          function() { console.log('called!'); });
	         *
	         *      Flow.channel.variables.subscribe(['price', 'cost'],
	         *          function() {
	         *              // this function called only once, with { price: X, cost: Y }
	         *          },
	         *          { batch: true });
	         *
	         *      Flow.channel.variables.subscribe(['price', 'cost'],
	         *          function() {
	         *              // this function called twice, once with { price: X }
	         *              // and again with { cost: Y }
	         *          },
	         *          { batch: false });
	         *
	         * @param {String|Array} topics The names of the variables.
	         * @param {Object|Function} subscriber The object or function being notified. Often this is a callback function. If this is not a function, a `trigger` method is called if available; if not, event is triggered on $(object).
	         * @param {Object} options (Optional) Overrides for the default channel options.
	         * @param {Boolean} options.silent Determine when to update state.
	         * @param {Boolean} options.batch If you are subscribing to multiple variables, by default the callback function is called once for each item to which you subscribe: `batch: false`. When `batch` is set to `true`, the callback function is only called once, no matter how many items you are subscribing to.
	         *
	         * @return {String} An identifying token for this subscription. Required as a parameter when unsubscribing.
	        */
	        subscribe: function (topics, subscriber, options) {
	            // console.log('subscribing', topics, subscriber);
	            var defaults = {
	                batch: false
	            };
	
	            topics = [].concat(topics);
	            if (!topics.length) {
	                console.warn(subscriber, 'tried to subscribe to an empty topic');
	            }
	            //use jquery to make event sink
	            if (!subscriber.on && !_.isFunction(subscriber)) {
	                subscriber = $(subscriber);
	            }
	
	            var id = _.uniqueId('epichannel.variable');
	            var data = $.extend({
	                id: id,
	                topics: topics,
	                target: subscriber
	            }, defaults, options);
	
	            this.subscriptions.push(data);
	
	            this.updateAndCheckForRefresh(topics);
	            return id;
	        },
	
	        /**
	         * Stop receiving notifications for all subscriptions referenced by this token.
	         *
	         * @param {String} token The identifying token for this subscription. (Created and returned by the `subscribe()` call.)
	         * @returns {undefined}
	        */
	        unsubscribe: function (token) {
	            this.subscriptions = _.reject(this.subscriptions, function (subs) {
	                return subs.id === token;
	            });
	        },
	
	        /**
	         * Stop receiving notifications for all subscriptions. No parameters.
	         *
	         * @returns {undefined}
	        */
	        unsubscribeAll: function () {
	            this.subscriptions = [];
	        }
	    };
	
	    $.extend(this, publicAPI);
	};


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * ## Operations Channel
	 *
	 * Channels are ways for Flow.js to talk to external APIs -- primarily the [underlying Epicenter APIs](../../../../creating_your_interface/).
	 *
	 * The primary use cases for the Operations Channel are:
	 *
	 * * `publish`: Call an operation.
	 * * `subscribe`: Receive notifications when an operation is called.
	 *
	 * For example, use `publish()` to call an operation (method) from your model:
	 *
	 *      Flow.channel.operations.publish('myMethod', myMethodParam);
	 *
	 * For reference, an equivalent call using Flow.js custom HTML attributes is:
	 *
	 *      <button data-f-on-click="myMethod(myMethodParam)">Click me</button>
	 *
	 * You can also use `subscribe()` and a callback function to listen and react when the operation has been called:
	 *
	 *      Flow.channel.operations.subscribe('myMethod',
	 *          function() { console.log('called!'); } );
	 *
	 * Use `subscribe(*)` to listen for notifications on all operations.
	 *
	 * To use the Operations Channel, simply [initialize Flow.js in your project](../../../#custom-initialize).
	 *
	*/
	
	
	'use strict';
	var config = __webpack_require__(2);
	
	module.exports = function (options) {
	    var defaults = {
	        /**
	         * Determine when to update state. Defaults to `false`: always trigger updates.
	         *
	         * Possible options are:
	         *
	         * * `true`: Never trigger any updates. Use this if you know your model state won't change based on operations.
	         * * `false`: Always trigger updates.
	         * * `[array of operation names]`: Operations in this array *will not* trigger updates; everything else will.
	         * * `{ except: [array of operation names] }`: Operations in this array *will* trigger updates; nothing else will.
	         *
	         * To set, pass this into the `Flow.initialize()` call in the `channel.run.operations` field:
	         *
	         *      Flow.initialize({
	         *          channel: {
	         *              run: {
	         *                  model: 'myModel.py',
	         *                  account: 'acme-simulations',
	         *                  project: 'supply-chain-game',
	         *                  operations: { silent: true }
	         *              }
	         *          }
	         *      });
	         *
	         * To override for a specific call to the Operations Channel, pass this as the final `options` parameter:
	         *
	         *       Flow.channel.operations.publish('myMethod', myMethodParam, { silent: true });
	         *
	         * @type {String|Array|Object}
	         */
	        silent: false,
	
	        /**
	         * Allow using the channel for reading data (subscribing), but disallow calls to `publish`. Defaults to `false`: allow both subscribing and publishing. If a function is provided, the function should return a Boolean value to override.
	         * @type {Boolean | Function}
	         */
	        readOnly: false,
	
	        interpolate: {}
	    };
	
	    var channelOptions = $.extend(true, {}, defaults, options);
	    this.options = channelOptions;
	
	    var run = channelOptions.run;
	
	    var publicAPI = {
	        //for testing
	        private: {
	            options: channelOptions
	        },
	
	        listenerMap: {},
	
	        getSubscribers: function (topic) {
	            var topicSubscribers = this.listenerMap[topic] || [];
	            var globalSubscribers = this.listenerMap['*'] || [];
	            return topicSubscribers.concat(globalSubscribers);
	        },
	
	        //Check for updates
	        /**
	         * Force a check for updates on the channel, and notify all listeners.
	         *
	         * @param {String|Array}  executedOpns Operations which just happened.
	         * @param {Any} response  Response from the operation.
	         * @param {Boolean} force  Ignore all `silent` options and force refresh.
	         * @param {Object} options (Optional) Overrides for the default channel options.
	         * @returns {undefined}
	         */
	        refresh: function (executedOpns, response, force, options) {
	            // console.log('Operations refresh', executedOpns);
	            var opts = $.extend(true, {}, channelOptions, options);
	
	            var silent = opts.silent;
	            var toNotify = executedOpns;
	            if (force === true) { // eslint-disable-line
	            } else if (silent === true) {
	                toNotify = [];
	            } else if (_.isArray(silent) && executedOpns) {
	                toNotify = _.difference(executedOpns, silent);
	            } else if ($.isPlainObject(silent) && executedOpns) {
	                toNotify = _.intersection(silent.except, executedOpns);
	            }
	
	            _.each(toNotify, function (opn) {
	                this.notify(opn, response);
	            }, this);
	        },
	
	        /**
	         * Alert each subscriber about the operation and its parameters. This can be used to provide an update without a round trip to the server. However, it is rarely used: you almost always want to `subscribe()` instead so that the operation is actually called in the model.
	         *
	         * **Example**
	         *
	         *      Flow.channel.operations.notify('myMethod', myMethodResponse);
	         *
	         * @param {String} operation Name of operation.
	         * @param {String|Number|Array|Object} value Parameter values for the callback function.
	         * @returns {undefined}
	        */
	        notify: function (operation, value) {
	            var listeners = this.getSubscribers(operation);
	            var params = {};
	            params[operation] = value;
	
	            _.each(listeners, function (listener) {
	                var target = listener.target;
	                if (_.isFunction(target)) {
	                    target(params, value, operation);
	                } else if (target.trigger) {
	                    listener.target.trigger(config.events.channelDataReceived, params);
	                } else {
	                    throw new Error('Unknown listener format for ' + operation);
	                }
	            });
	        },
	
	        interpolate: function (params) {
	            var ip = this.options.interpolate;
	            var match = function (p) {
	                var mapped = p;
	                if (ip[p]) {
	                    mapped = _.isFunction(ip[p]) ? ip[p](p) : ip[p];
	                }
	                return mapped;
	            };
	            return ($.isArray(params)) ? _.map(params, match) : match(params);
	        },
	
	        /**
	         * Call the operation with parameters, and alert subscribers.
	         *
	         * **Example**
	         *
	         *      Flow.channel.operations.publish('myMethod', myMethodParam);
	         *      Flow.channel.operations.publish({
	         *          operations: [{ name: 'myMethod', params: [myMethodParam] }]
	         *      });
	         *
	         * @param  {String|Object} operation For one operation, pass the name of operation (string). For multiple operations, pass an object with field `operations` and value array of objects, each with `name` and `params`: `{operations: [{ name: opn, params:[] }] }`.
	         * @param {String|Number|Array|Object} params (Optional)  Parameters to send to operation. Use for one operation; for multiple operations, parameters are already included in the object format.
	         * @param {Object} options (Optional) Overrides for the default channel options.
	         * @param {Boolean} options.silent Determine when to update state.
	         *
	         * @return {$promise} Promise to complete the call.
	         */
	        publish: function (operation, params, options) {
	            var me = this;
	            var opts = ($.isPlainObject(operation)) ? params : options;
	            opts = $.extend(true, {}, channelOptions, opts);
	
	            if (_.result(opts, 'readOnly')) {
	                console.warn('Tried to publish to a read-only channel', operation);
	                return $.Deferred().reject().promise();
	            }
	
	            if ($.isPlainObject(operation) && operation.operations) {
	                var fn = (operation.serial) ? run.serial : run.parallel;
	                _.each(operation.operations, function (opn) {
	                    opn.params = this.interpolate(opn.params);
	                }, this);
	                return fn.call(run, operation.operations)
	                    .then(function (response) {
	                        me.refresh(_.pluck(operation.operations, 'name'), response, null, opts);
	                    });
	            } else {
	                if (!$.isPlainObject(operation) && params) {
	                    params = this.interpolate(params);
	                }
	                return run.do(operation, params)
	                    .then(function (response) {
	                        me.refresh([operation], response, null, opts);
	                        return response.result;
	                    });
	            }
	            // console.log('operations publish', operation, params);
	        },
	
	        /**
	         * Subscribe to changes on a channel: Ask for notification when operations are called.
	         *
	         * **Example**
	         *
	         *      Flow.channel.operations.subscribe('myMethod',
	         *          function() { console.log('called!'); });
	         *
	         * @param {String|Array} operations The names of the operations. Use `*` to listen for notifications on all operations.
	         * @param {Object|Function} subscriber The object or function being notified. Often this is a callback function.
	         *
	         * @return {String} An identifying token for this subscription. Required as a parameter when unsubscribing.
	        */
	        subscribe: function (operations, subscriber) {
	            // console.log('operations subscribe', operations, subscriber);
	            operations = [].concat(operations);
	            //use jquery to make event sink
	            if (!subscriber.on && !_.isFunction(subscriber)) {
	                subscriber = $(subscriber);
	            }
	
	            var id = _.uniqueId('epichannel.operation');
	            var data = {
	                id: id,
	                target: subscriber
	            };
	
	            var me = this;
	
	            $.each(operations, function (index, opn) {
	                if (!me.listenerMap[opn]) {
	                    me.listenerMap[opn] = [];
	                }
	                me.listenerMap[opn] = me.listenerMap[opn].concat(data);
	            });
	
	            return id;
	        },
	
	        /**
	         * Stop receiving notification when an operation is called.
	         *
	         * @param {String|Array} operation The names of the operations.
	         * @param {String} token The identifying token for this subscription. (Created and returned by the `subscribe()` call.)
	         * @returns {undefined}
	        */
	        unsubscribe: function (operation, token) {
	            this.listenerMap[operation] = _.reject(this.listenerMap[operation], function (subs) {
	                return subs.id === token;
	            });
	        },
	
	        /**
	         * Stop receiving notifications for all operations. No parameters.
	         *
	         * @returns {undefined}
	        */
	        unsubscribeAll: function () {
	            this.listenerMap = {};
	        }
	    };
	    return $.extend(this, publicAPI);
	};


/***/ }
/******/ ]);
//# sourceMappingURL=flow.js.map