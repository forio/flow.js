'use strict';

module.exports = function ($container, evtName) {
    var template = require('./legend-panel.html');
    var $html = $(template);

    $container.append($html);
    $container.on('click', ':checkbox', function (evt) {
        evt.stopPropagation();
        var $target = $(evt.target);
        var type = $target.parent().attr('class').replace('f-', '');
        var subType = $target.parent().children('[class^=f-]').attr('class').replace('f-', '');
        $container.trigger(evtName, type + '-' + subType);
    });

    $html.on('dragstart', function (evt) {
        // console.log('drag start', evt);
        $(evt.target).css('opacity', 0.5);
    });
    $html.on('dragend', function (evt) {
        // console.log('drag end', evt);
        $(evt.target).css('opacity', 1);
    });

};
