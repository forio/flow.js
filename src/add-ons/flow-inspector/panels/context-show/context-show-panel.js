'use strict';

var ContextExtractor = require('./context-extractor');

module.exports = function ($container, configFunction) {
    var template = require('./context-show.html');
    var $html = $(template);

    if (!configFunction) {
        console.warn('You\'re using an older version of FlowJS which does not support viewing model context.');
        return false;
    }

    var config = configFunction();
    var modelType = config.model.split('.')[1];
    if (modelType === 'vmf') {
        console.info('Cannot view context for Vensim models.');
        return false;
    }

    var file = new F.service.File(config);
    file.getContents(config.model, 'model')
        .then(function (response) {
            var extractor = new ContextExtractor(config.model, response);
            $container.on('click', '.f-bind, .f-foreach, .f-on', function (evt) {
                var $target = $(evt.target).is('.f-val') ? $(evt.target) : $(evt.target).parent().find('.f-val');
                var variableName = $target.text().trim();
                var isFunction = $target.parent().is('.f-on');
                var context = extractor.showContext(variableName, isFunction);
                $html.find('pre').html(context);
            });
            $container.append($html);
        })
        .fail(function () {
            console.info('Could not get model file contents; this is only available if you\'re logged in as an admin or team-member.');
        });

    var xOffset = 0;
    var yOffset = 0;
    var isDragged = false;
    $html.on('mousedown', function (evt) {
        xOffset = evt.clientX - $html.offset().left;
        yOffset = evt.clientY - $html.offset().top;
        isDragged = true;
        return false;
    });
    $html.on('mousemove', function (evt) {
        if (isDragged) {
            evt.stopPropagation();
            $html.css({
                top: evt.clientY - yOffset,
                left: evt.clientX - xOffset
            });
            return false;
        }
    });
    $html.on('mouseup', function (evt) {
        isDragged = false;
    });

};


