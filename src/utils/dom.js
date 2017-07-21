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

    getChannel: function ($el, property) {
        property = property.replace('data-f-', '');
        var channel = $el.data('f-channel-' + property);
        if (channel === undefined) {
            channel = $el.attr('data-f-channel'); //.data shows value cached by jquery
            if (channel === undefined) {
                var $parentEl = $el.closest('[data-f-channel]');
                if ($parentEl) {
                    channel = $parentEl.attr('data-f-channel');
                }
            }
        }
        return channel;
    },

    getChannelConfig: function (el) {
        var attrs = el.attributes;
        var config = {};
        for (var i = 0; i < attrs.length; i++) {
            var attrib = el.attributes[i];
            if (attrib.specified && attrib.name.indexOf('data-f-channel-') === 0) {
                var key = attrib.name.replace('data-f-channel-', '');
                config[key] = attrib.value;
            }
        }
        return config;
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
                attrConverters = attrConverters.split('|').map((v)=> v.trim());
            }
        }

        return attrConverters;
    }
};
