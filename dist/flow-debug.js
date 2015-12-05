'use strict';
$(function () {
    var $canvas = $('<canvas> </canvas>');

    function draw(elementTop, elementLeft, elementWidth, elementHeight, fillColor) {
        var ctx = $canvas.get(0).getContext('2d');
        ctx.fillStyle = fillColor;
        ctx.fillRect(elementLeft, elementTop, elementWidth, elementHeight);
    }
    function eraseCanvas(elementTop, elementLeft, elementWidth, elementHeight) {
        var ctx = $canvas.get(0).getContext('2d');
        ctx.clearRect(elementLeft, elementTop, elementWidth, elementHeight);
    }

    var windowHeight = $(document).height();
    var windowWidth = $(document).width();

    $canvas.attr({
        width: windowWidth,
        height: windowHeight
    });

    $('body').append($canvas);
    draw(0, 0, windowWidth, windowHeight, 'rgba(0,0,0,.4)');

    var $overlayContainer = $('<div class="f-item-containers"> </div>');
    var elemCounter = 0;
    $(':f').each(function (index, elem) {
        elemCounter++;
        var $thisElemContainer = $('<div id="f-container-' + elemCounter + '"> </div');


        $overlayContainer.append($thisElemContainer);
        var pos = $(elem).offset();
        $thisElemContainer.css({
            top: (pos.top - 20) + 'px',
            left: (pos.left) + 'px'
        });

        if (!$(elem).children().length) {
            eraseCanvas(pos.top, pos.left, $(elem).innerWidth(), $(elem).innerHeight(),  elem);
        }

        $(elem.attributes).each(function (index, nodeMap) {
            var attr = nodeMap.nodeName;
            var wantedPrefix = 'data-f';
            if (attr.indexOf(wantedPrefix) === 0) {
                attr = attr.replace(wantedPrefix, '');
                var val = nodeMap.value;
                $thisElemContainer.append('<div>' + val + '</div>');
            }
        });
    });

    $('body').prepend($overlayContainer);

});
