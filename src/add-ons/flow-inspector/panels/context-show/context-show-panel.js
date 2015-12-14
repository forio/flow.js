'use strict';

module.exports = function ($container, promise) {
    var template = require('./context-show.html');
    var $html = $(template);

    $container.on('click', '.f-bind, .f-foreach, .f-on', function (evt) {
        var $target = $(evt.target).is('.f-val') ? $(evt.target) : $(evt.target).parent().find('.f-val');
        var variableName = $target.text().trim();
        var isFunction = $target.parent().is('.f-on');
        promise.then(function (extractor) {
            var context = extractor.showContext(variableName, isFunction);
            $html.find('pre').html(context);
        });
    });

    $container.append($html);
};


