'use strict';

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (value) {
        var oldHTML = this.html();
        var cleanedHTML = oldHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        var valueToTemplate = ($.isPlainObject(value)) ? value : { value: value };
        var templated = _.template(cleanedHTML, valueToTemplate);
        if (cleanedHTML === templated) {
            if (_.isArray(value)) {
                value = value[value.length - 1];
            }
            value += '';
            this.html(value);
        } else {
            this.html(templated);
        }
    }
};
