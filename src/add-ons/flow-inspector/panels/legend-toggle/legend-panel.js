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

    var pageX = 0;
    var pageY = 0;

    $html.on('dragstart', function (evt) {
        // console.log('drag start', evt);
        console.log('original',
            evt.originalEvent.pageX,
            $(evt.target).offset().left);

        pageX = evt.originalEvent.pageX;
        pageY = evt.originalEvent.pageY;
        $(evt.target).css('opacity', 0.5);
    });
    $html.on('dragend', function (evt) {

        // console.log('drag end', evt);
        console.log('new', evt.originalEvent.pageX, $html.offset().left, pageX);
        // var horMove = pageX - evt.originalEvent.pageX;
        // var verticalMove = pageY - evt.originalEvent.pageY;

        var newXOffset = evt.originalEvent.pageX - pageX;
        console.log(newXOffset);
        // $html.css({
        //     // top: $html.offset().top - verticalMove,
        //     left: ($html.offset().left + newXOffset) + 'px'
        // });

        // $(evt.target).css('opacity', 1);
    });

    $container.on('dragover', function (event) {
        console.log('dragover');
        event.originalEvent.preventDefault();
        // event.originalEvent.dataTransfer.dropEffect = 'move';
    });
    $container.on('drop', function (event) {
        console.log('drop', event.originalEvent.pageX, $html.offset().left, pageX);

        event.originalEvent.stopPropagation();
        event.originalEvent.preventDefault();

        var newXOffset = event.originalEvent.pageX - pageX;
        $html.css({
            // top: $html.offset().top - verticalMove,
            left: ($html.offset().left + newXOffset) + 'px'
        });
    });
};
