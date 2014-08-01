'use strict';

var defaultconverters = [
    require('./number-converter'),
    require('./string-converter'),
    require('./numberformat-converter'),
];

var convertersList = [];
$.each(defaultconverters, function(index, converter) {
    convertersList.push(converter);
});

var normalize = function (alias, converter) {
    if (_.isFunction(converter)) {
        return {
            alias: alias,
            convert: converter
        };
    }
    return converter;
};

var matchConverter = function (alias, converter) {
    if (_.isString(converter.alias)) {
        return alias === converter.alias;
    }
    else if (_.isFunction(converter.alias)) {
        return converter.alias(alias);
    }
    else if (_.isRegex(converter.alias)) {
        return converter.alias.match(alias);
    }
    return false;
};

module.exports = {
    private: {
        matchConverter: matchConverter
    },

    list: convertersList,
    /**
     * Add a new attribute converter
     * @param  {string|function|regex} alias formatter name
     * @param  {function|object} converter    converter can either be a function, which will be called with the value, or an object with {alias: '', parse: $.noop, convert: $.noop}
     */
    register: function (alias, converter) {
        convertersList.unshift(normalize(alias, converter));
    },

    replace: function(alias, converter) {
        var index;
        _.each(convertersList, function(currentConverter, i) {
            if (matchConverter(alias, currentConverter)) {
                index = i;
                return false;
            }
        });
        convertersList.splice(index, 1, normalize(alias, converter));
    },

    getConverter: function (alias) {
        return _.find(convertersList, function (converter) {
            return matchConverter(alias, converter);
        });
    },

    convert: function (value, list) {
        if (!list || !list.length) {
            return value;
        }

        list = [].concat(list);
        var currentValue = value;
        var me = this;
        _.each(list, function (converterName){
            var converter = me.getConverter(converterName);
            currentValue = converter.convert(currentValue, converterName);
        });
        return currentValue;
    }
};

