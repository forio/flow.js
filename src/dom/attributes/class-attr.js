'use strict';

module.exports = {

    test: 'class',

    target: '*',

    handle: function(value, prop) {
        var addedClasses = this.data('added-classes');
        if (!addedClasses) {
            addedClasses = {};
        }
        if (addedClasses[prop]) {
            this.removeClass(addedClasses[prop]);
        }
        addedClasses[prop] = value;

        this.addClass(value);
        this.data('added-classes', addedClasses);
    }
};
