var FlowDebug = function () {
    'use strict';
    $(function () {
        var $canvas = $('<canvas> </canvas>');

        function draw(elementTop, elementLeft, elementWidth, elementHeight, fillColor) {
            var ctx = $canvas.get(0).getContext('2d');
            ctx.fillStyle = fillColor;
            ctx.fillRect(elementLeft, elementTop, elementWidth, elementHeight);
        }

        function drawRect(elementTop, elementLeft, elementWidth, elementHeight, fillColor) {
            var ctx = $canvas.get(0).getContext('2d');
            ctx.setLineDash([4,2]);
            ctx.lineWidth = 1;
            var offset = 3;
            ctx.strokeRect(elementLeft - offset, elementTop - offset, elementWidth + (2 * offset), elementHeight + (2 * offset));
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
                top: (pos.top - 25) + 'px',
                left: (pos.left) + 'px'
            });

            // $(elem).css({
            //     border: '1px dashed red'
            // });


            var getClassNames = function (elem, attr, val) {
                var elemType = elem.nodeName.toLowerCase();
                var isInputElement = ['input', 'a', 'button'].indexOf(elemType) !== -1;

                var classNames = [];
                classNames.push(isInputElement ? 'f-input' : 'f-output');
                if (attr.indexOf('on-') === 0) {
                    classNames.push('f-on');
                }
                if (attr.indexOf('bind') === 0) {
                    classNames.push('f-bind');
                }
                if (attr.indexOf('foreach') === 0) {
                    classNames.push('f-foreach');
                }
                return classNames.join(' ');
            };
            if (!$(elem).children().length) {
                eraseCanvas(pos.top, pos.left, $(elem).innerWidth(), $(elem).innerHeight(),  elem);
                // drawRect(pos.top, pos.left, $(elem).innerWidth(), $(elem).innerHeight(),  elem);
            }

            $(elem.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                var wantedPrefix = 'data-f-';
                if (attr.indexOf(wantedPrefix) === 0) {
                    attr = attr.replace(wantedPrefix, '');
                    var val = nodeMap.value;
                    var $newEl = $('<div> <span class="f-type">' + attr + ': </span> <span class="f-val">' + val + '</div>');
                    $newEl.addClass(getClassNames(elem, attr));
                    $thisElemContainer.append($newEl);

                    if (!$(elem).children().length) {
                        // $(elem).css('background-color', '#ff4c4c');
                    }
                }
            });
        });
        $('body').prepend($overlayContainer);
    });
}();
