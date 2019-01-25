import { isString, isFunction, isRegExp, each } from 'lodash';

const defaultHandlers = [
    require('./attributes/no-op-attr').default,
    require('./attributes/events/default-event-attr').default,
    require('./attributes/loop-attrs/foreach-attr').default,
    require('./attributes/loop-attrs/repeat-attr').default,
    require('./attributes/class-attr').default,
    require('./attributes/boolean-attr').default,
    require('./attributes/toggles/show-if-attr').default,
    require('./attributes/toggles/hide-if-attr').default,
    require('./attributes/binds/checkbox-radio-bind-attr').default,
    require('./attributes/binds/input-bind-attr').default,
    require('./attributes/binds/default-bind-attr').default,
    require('./attributes/default-attr').default
];

const handlersList = [];

const normalize = function (attributeMatcher, nodeMatcher, handler) {
    if (!nodeMatcher) {
        nodeMatcher = '*';
    }
    if (isFunction(handler)) {
        handler = {
            handle: handler
        };
    }
    return $.extend(handler, { test: attributeMatcher, target: nodeMatcher });
};

defaultHandlers.forEach(function (handler) {
    handlersList.push(normalize(handler.test, handler.target, handler));
});


const matchAttr = function (matchExpr, attr, $el) {
    let attrMatch;

    if (isString(matchExpr)) {
        attrMatch = (matchExpr === '*' || (matchExpr.toLowerCase() === attr.toLowerCase()));
    } else if (isFunction(matchExpr)) {
        //TODO: remove element selectors from attributes
        attrMatch = matchExpr(attr, $el);
    } else if (isRegExp(matchExpr)) {
        attrMatch = attr.match(matchExpr);
    }
    return attrMatch;
};

const matchNode = function (target, nodeFilter) {
    return (isString(nodeFilter)) ? (nodeFilter === target) : nodeFilter.is(target);
};

const attributeManager = {
    list: handlersList,
    /**
     * Add a new attribute handler.
     *
     * @param  {string|Function|RegExp} attributeMatcher Description of which attributes to match.
     * @param  {string|JQuery<HTMLElement>} nodeMatcher Which nodes to add attributes to. Use [jquery Selector syntax](https://api.jquery.com/category/selectors/).
     * @param  {Function|Object} handler If `handler` is a function, the function is called with `$element` as context, and attribute value + name. If `handler` is an object, it should include two functions, and have the form: `{ init: fn,  handle: fn }`. The `init` function is called when the page loads; use this to define event handlers. The `handle` function is called with `$element` as context, and attribute value + name.
     * @returns {void}
     */
    register: function (attributeMatcher, nodeMatcher, handler) {
        handlersList.unshift(normalize.apply(null, arguments));
    },

    /**
     * Find an attribute matcher matching some criteria.
     *
     * @param  {string} attrFilter Attribute to match.
     * @param  {string|JQuery<HTMLElement>} nodeFilter Node to match.
     *
     * @returns {AttributeHandler[]} An array of matching attribute handlers, or null if no matches found.
     */
    filter: function (attrFilter, nodeFilter) {
        let filtered = handlersList.filter(function (handler) {
            return matchAttr(handler.test, attrFilter);
        });
        if (nodeFilter) {
            filtered = filtered.filter(function (handler) {
                return matchNode(handler.target, nodeFilter);
            });
        }
        return filtered;
    },

    /**
     * Replace an existing attribute handler.
     *
     * @param  {string} attrFilter Attribute to match.
     * @param  {string|JQuery<HTMLElement>} nodeFilter Node to match.
     * @param  {Function|Object} handler The updated attribute handler. If `handler` is a function, the function is called with `$element` as context, and attribute value + name. If `handler` is an object, it should include two functions, and have the form: `{ init: fn,  handle: fn }`. The `init` function is called when the page loads; use this to define event handlers. The `handle` function is called with `$element` as context, and attribute value + name.
     * @returns {void}
     */
    replace: function (attrFilter, nodeFilter, handler) {
        let index;
        each(handlersList, function (currentHandler, i) {
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
     * @param {string} attr The attribute.
     * @param {string|JQuery<HTMLElement>} $el The DOM element.
     *
     * @returns {AttributeHandler|undefined} The attribute handler, if a matching one is found
     */
    getHandler: function (attr, $el) {
        const filtered = this.filter(attr, $el);
        //There could be multiple matches, but the top first has the most priority
        return filtered[0];
    }
};

export default attributeManager;
