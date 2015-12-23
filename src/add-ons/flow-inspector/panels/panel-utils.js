'use strict';

module.exports = (function () {
    var xOffset = 0;
    var yOffset = 0;
    var isDragged = false;

    return {
        makeDraggable: function ($element) {
            $element.on('mousedown', function (evt) {
                evt.preventDefault();
                xOffset = evt.clientX - $element.offset().left;
                yOffset = evt.clientY - $element.offset().top;
                isDragged = $element;
                return false;
            });
            $(window.document).on('mousemove', function (evt) {
                if (isDragged === $element) {
                    evt.stopPropagation();
                    $element.css({
                        top: evt.clientY - yOffset,
                        left: evt.clientX - xOffset
                    });
                    return false;
                }
            });
            $(window.document).on('mouseup', function (evt) {
                isDragged = false;
            });
        }
    };
}());
