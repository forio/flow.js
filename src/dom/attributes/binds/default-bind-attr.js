'use strict';

module.exports = {

    target: '*',

    test: 'bind',

    handle: function (value) {
        var templated;
        var valueToTemplate = ($.isPlainObject(value)) ? value : { value: value };
        var bindTemplate = this.data('bind-template');
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
                value += '';
                this.html(value);
            } else {
                this.data('bind-template', cleanedHTML);
                this.html(templated);
            }
        }
    }
};
