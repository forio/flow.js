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

    var xOffset = 0;
    var yOffset = 0;
    var isDragged = false;
    $(window.document).on('mousedown', function (evt) {
        if ($html.is($(evt.target)) || $html.has($(evt.target)).size()) {
            evt.preventDefault();
            xOffset = evt.clientX - $html.offset().left;
            yOffset = evt.clientY - $html.offset().top;
            isDragged = true;
            return false;
        }
    });
    $(window.document).on('mousemove', function (evt) {
        if (isDragged) {
            evt.stopPropagation();
            $html.css({
                top: evt.clientY - yOffset,
                left: evt.clientX - xOffset
            });
            return false;
        }
    });
    $(window.document).on('mouseup', function (evt) {
        isDragged = false;
    });

};
