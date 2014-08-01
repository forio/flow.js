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

var normalizeConverter = function (alias, converter) {
    if (_.isFunction(converter)) {
        return {
            alias: alias,
            convert: converter
        };
    }
    return converter;
};

module.exports = {
    list: convertersList,
    /**
     * Add a new attribute converter
     * @param  {string|function|regex} alias formatter name
     * @param  {function|object} converter    converter can either be a function, which will be called with the value, or an object with {alias: '', parse: $.noop, convert: $.noop}
     */
    register: function (alias, converter) {
        convertersList.unshift(normalizeConverter(alias, converter));
    },

    getConverter: function (alias) {
        return _.find(convertersList, function (converter) {
            if (_.isString(converter.alias)) {
                return alias === converter.alias;
            }
            else if (_.isFunction(converter.alias)) {
                return converter.alias(alias);
            }
            else if (_.isRegex(converter.alias)) {
                return converter.alias.match(alias);
            }
        });
    },

    convert: function (value, convertersList) {
        convertersList = [].concat(convertersList);
        var currentValue = value;
        var me = this;
        _.each(convertersList, function (converterName){
            var converter = me.getConverter(converterName);
            currentValue = converter(currentValue);
        });
    }
};

