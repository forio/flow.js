import { isFunction, isString, isRegExp, find, mapValues } from 'lodash';
import { splitNameArgs, toImplicitType } from '../utils/parse-utils';

var normalize = function (alias, converter, acceptList) {
    var ret = [];
    //nomalize('flip', fn)
    if (isFunction(converter)) {
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
    if (isString(converter.alias)) {
        return alias === converter.alias;
    } else if (isFunction(converter.alias)) {
        return converter.alias(alias);
    } else if (isRegExp(converter.alias)) {
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
     *          return max(value);
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
     * @param  {string|function|RegExp} alias Formatter name.
     * @param  {function|object} [converter] If a function, `converter` is called with the value. If an object, should include fields for `alias` (name), `parse` (function), and `convert` (function).
     * @param {boolean} [acceptList] Determines if the converter is a 'list' converter or not. List converters take in arrays as inputs, others expect single values.
     * @returns {void}
     */
    register: function (alias, converter, acceptList) {
        var normalized = normalize(alias, converter, acceptList);
        this.list = normalized.concat(this.list);
    },

    /**
     * Replace an already registered converter with a new one of the same name.
     *
     * @param {string} alias Formatter name.
     * @param {function|object} converter If a function, `converter` is called with the value. If an object, should include fields for `alias` (name), `parse` (function), and `convert` (function).
     * @returns {void}
     */
    replace: function (alias, converter) {
        var index;
        this.list.forEach(function (currentConverter, i) {
            if (matchConverter(alias, currentConverter)) {
                index = i;
                return false;
            }
        });
        this.list.splice(index, 1, normalize(alias, converter)[0]);
    },

    getConverter: function (alias) {
        var norm = splitNameArgs(alias);
        norm.args = norm.args.map(toImplicitType);

        var conv = find(this.list, function (converter) {
            return matchConverter(norm.name, converter);
        });
        if (conv && norm.args) {
            return $.extend({}, conv, { convert: Function.bind.apply(conv.convert, [null].concat(norm.args)) });
        }
        return conv;
    },

    /**
     * Pipes the value sequentially through a list of provided converters.
     *
     * @param  {*} value Input for the converter to tag.
     * @param  {string|string[]} list List of converters (maps to converter alias).
     *
     * @return {*} Converted value.
     */
    convert: function (value, list) {
        if (!list || !list.length) {
            return value;
        }
        list = ([].concat(list)).map((v)=> v.trim());

        var currentValue = value;
        var me = this;

        var convertArray = function (converter, val, converterName) {
            return val.map(function (v) {
                return converter.convert(v, converterName);
            });
        };
        var convert = function (converter, value, converterName) {
            var converted;
            if (Array.isArray(value) && converter.acceptList !== true) {
                converted = convertArray(converter, value, converterName);
            } else {
                converted = converter.convert(value, converterName);
            }
            return converted;
        };
        var convertObject = function (converter, value, converterName) {
            return mapValues(value, function (val) {
                return convert(converter, val, converterName);
            });
        };
        list.forEach(function (converterName) {
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
     * @param  {*} value Value to parse.
     * @param  {string|string[]} list  List of parsers to run the value through. Outermost is invoked first.
     * @return {*} Original value.
     */
    parse: function (value, list) {
        if (!list || !list.length) {
            return value;
        }
        list = [].concat(list).reverse().map((v)=> v.trim());

        var currentValue = value;
        var me = this;
        list.forEach(function (converterName) {
            var converter = me.getConverter(converterName);
            if (!converter) {
                throw new Error('parse: Could not find converter ' + converterName);
            }
            if (converter.parse) {
                currentValue = converter.parse(currentValue, converterName);
            }
        });
        return currentValue;
    }
};


//Bootstrap
var defaultconverters = [
    require('./number-converter'),
    require('./string-converter'),
    require('./array-converter'),
    require('./general-util-converters'),
    require('./numberformat-converter'),
    require('./number-compare-converters'),
    require('./bool-conditional-converters'),
    require('./collection-converters')
];

defaultconverters.reverse().forEach(function (converter) {
    if (Array.isArray(converter)) {
        converter.forEach(function (c) {
            converterManager.register(c);
        });
    } else {
        converterManager.register(converter);
    }
});

export default converterManager;
