'use strict';

module.exports = {

    test: $.expr.match.bool,

    handle: function(prop, value) {
        var addedClasses = $(this).data('f-added-classes');
        $.each(addedClasses, function (index, cls) {
            $(this).removeClass(cls);
        });
        $(this).data('f-added-classes', '');
        this.$el.addClass(value);
    }
};
