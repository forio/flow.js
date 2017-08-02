'use strict';

var panelManager = require('./panels/panel-manager');

var FlowInspector = function (root) {

    function draw(el, elementTop, elementLeft, elementWidth, elementHeight, fillColor) {
        var ctx = el.getContext('2d');
        ctx.fillStyle = fillColor;
        ctx.fillRect(elementLeft, elementTop, elementWidth, elementHeight);
    }
    function eraseCanvas(el, elementTop, elementLeft, elementWidth, elementHeight) {
        var ctx = el.getContext('2d');
        var offset = 0;
        ctx.clearRect(elementLeft - offset, elementTop - offset, elementWidth + (2 * offset), elementHeight + (2 * offset));
    }

    var overlayCanvas = function ($canvas) {
        var windowHeight = $(document).height();
        var windowWidth = $(document).width();
        $canvas.attr({
            width: windowWidth,
            height: windowHeight
        });

        var el = $canvas.get(0);
        draw(el, 0, 0, windowWidth, windowHeight, 'rgba(0,0,0,.4)');
    };

    var drawModalCanvas = function () {
        var $canvas = $('<canvas class="f-modal"></canvas>');
        overlayCanvas($canvas);
        $(window).on('resize', function () {
            overlayCanvas($canvas);
        });
        $(root).append($canvas);

        return $canvas.get(0);
    };

    var getClassNames = function (elem, attr) {
        var elemType = elem.nodeName.toLowerCase();
        var isInputElement = ['input', 'a', 'button'].indexOf(elemType) !== -1;

        var classNames = [];
        classNames.push(isInputElement ? 'f-input' : 'f-output');
        if (attr.indexOf('on-') === 0) {
            classNames.push('f-on');
        } else if (attr.indexOf('bind') === 0) {
            classNames.push('f-bind');
        } else if (attr.indexOf('foreach') === 0 || attr.indexOf('repeat') === 0) {
            classNames.push('f-loop');
        } else if (attr.indexOf('model') === -1) {
            classNames.push('f-custom');
        }
        return classNames.join(' ');
    };

    $(function () {

        var canvas = drawModalCanvas();

        var $overlayContainer = $('<div class="f-item-containers"></div>');

        var elemCounter = 0;
        $(':f').each(function (index, elem) {
            elemCounter++;
            var $thisElemContainer = $('<div id="f-container-' + elemCounter + '"></div');

            var pos = $(elem).offset();
            var elemHeightOffset = 25;
            $thisElemContainer.css({
                top: (pos.top - elemHeightOffset) + 'px',
                left: (pos.left) + 'px'
            });

            if (!$(elem).children().length) {
                eraseCanvas(canvas, pos.top, pos.left, $(elem).innerWidth(), $(elem).innerHeight(), elem);
            }

            $(elem.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                var wantedPrefix = 'data-f-';
                if (attr.indexOf(wantedPrefix) === 0) {
                    attr = attr.replace(wantedPrefix, '');

                    var displayAttrName = attr.replace('on-', '');
                    var chain = nodeMap.value.split('|').map(function (v) { return v.trim(); });
                    var originalVal = chain.shift();

                    var $type = $('<span class="f-type"></span>').text(displayAttrName);
                    var $val = $('<span class="f-val"></span>').text(originalVal);

                    var $newEl = $('<div> </div>').append($type).append($val);

                    chain.forEach(function (val) {
                        var cname = (attr.indexOf('on') === 0) ? 'f-val' : 'f-conv';
                        var $conv = $('<span class="' + cname + '"></span').text(val);
                        $newEl.append($conv);
                    });
                    $newEl.addClass(getClassNames(elem, attr));
                    $thisElemContainer.append($newEl);
                }
            });
            $overlayContainer.append($thisElemContainer);
        });

        //TODO: This is a little awkward, refactor to be more like backbone-views
        var evtName = 'f-select:type';
        var addLegendPanel = panelManager.getPanel('filter');
        addLegendPanel($overlayContainer, evtName);
        $overlayContainer.on(evtName, function (evt, type) {
            $(root).toggleClass('hide-f-' + type);
        });

        var addContextPanel = panelManager.getPanel('context');
        addContextPanel($overlayContainer, window.Flow.channel.run.getCurrentConfig);
        $(root).prepend($overlayContainer);
    });
};

if (!window.Flow) { window.Flow = {}; }
window.Flow.Inspector = FlowInspector;
module.exports = FlowInspector;
