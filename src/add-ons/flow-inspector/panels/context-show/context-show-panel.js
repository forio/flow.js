'use strict';

var ContextExtractor = require('./context-extractor');

module.exports = function ($container) {
    var template = require('./context-show.html');
    var $html = $(template);

    if (!window.Flow.channel.run.getCurrentConfig) {
        console.warn('You\'re using an older version of FlowJS which does not support viewing model context');
        return false;
    }

    var config = window.Flow.channel.run.getCurrentConfig();
    var modelType = config.model.split('.')[1];
    if (modelType === 'vmf') {
        console.warn('Cannot view context for Vensim models');
        return false;
    }

    var file = new F.service.File(config);
    var promise = file.getFileContents(config.model, 'model').then(function (response) {
        var extractor = new ContextExtractor(config.model, response);
        return extractor;
    });
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


