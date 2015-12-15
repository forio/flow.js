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
 * Built-in attribute managers like `data-f-value` and `data-f-foreach` automatically bind variables in your project's model to particular HTML elements. However, the value of the variable itself isn't always what you want in the UI.
 *
 * One application of custom attribute managers is to display particular HTML elements or content based on the value of a model variable, without displaying the value of the variable itself. For example, when your model variable meets a certain condition, you may want to show specific text in your UI based on the value of that variable. Creating a custom attribute manager is an easy way to do this:
 *
 *      Flow.dom.attributes.register('showProfitFeedback', '*', function(profit) {
 *            var profitStr = '';
 *
 *            if (profit > 0.10) { profitStr += 'Great work so far! Your firm is doing extremely well.'; }
 *            else if ( profit > 0 ) { profitStr += 'Your firm is profitable, but there is room for improvement.'; }
 *            else { profitStr += 'Careful, your firm is currently running at a loss. Consider strategies to increase sales or decrease spending.' }
 *
 *            this.html(profitStr);
 *      });
 *
 * Then, you can use the attribute manager in your HTML just like other Flow.js attributes:
 *
 *      <div data-f-showProfitFeedback="profit"></div>
 *
 * Another example of when custom attribute managers are useful is when your model variable is a complex object and you want to display the fields in a particular way, or you only want to display some of the fields. While the combination of the [`data-f-foreach` attribute](../foreach/default-foreach-attr/) and [templating](../../../#templates) can help with this, sometimes it's easier to write your own attribute manager. (This is especially true if you will be reusing the attribute manager -- you won't have to copy your templating code over and over.)
 *
 *      Flow.dom.attributes.register('showSched', '*', function (sched) {
 *            // display all the schedule milestones
 *            // sched is an object, each element is an array
 *            // of ['Formal Milestone Name', milestoneMonth, completionPercentage]
 *
 *            var schedStr = '<ul>';
 *            var sortedSched = _.sortBy(sched, function(elem) { return elem[1]; });
 *
 *            for (var i = 0; i < sortedSched.length; i++) {
 *                  schedStr += '<li><strong>' + sortedSched[i][0] + '</strong> currently scheduled for <strong>Month ' + sortedSched[i][1] + '</strong></li>'
 *            }
 *            schedStr += '</ul>';
 *
 *            this.html(schedStr);
 *      });
 *
 * Then, you can use the attribute manager in your HTML just like other Flow.js attributes:
 *
 *      <div data-f-showSched="vars.schedule"></div>
 *
 */

'use strict';

var defaultHandlers = [
    require('./no-op-attr'),
    require('./events/init-event-attr'),
    require('./events/default-event-attr'),
    require('./foreach/default-foreach-attr'),
    require('./binds/checkbox-radio-bind-attr'),
    require('./binds/input-bind-attr'),
    require('./class-attr'),
    require('./positive-boolean-attr'),
    require('./negative-boolean-attr'),
    require('./binds/default-bind-attr'),
    require('./default-attr')
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

