'use strict';

var addControlPanel = require('./panels/legend-toggle/legend-panel');

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
    var drawModalCanvas = function () {
        var $canvas = $('<canvas class="f-modal"></canvas>');

        var windowHeight = $(document).height();
        var windowWidth = $(document).width();
        $canvas.attr({
            width: windowWidth,
            height: windowHeight
        });

        $(root).append($canvas);
        var el = $canvas.get(0);
        draw(el, 0, 0, windowWidth, windowHeight, 'rgba(0,0,0,.4)');

        return el;
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
        } else if (attr.indexOf('foreach') === 0) {
            classNames.push('f-foreach');
        } else {
            classNames.push('f-custom');
        }
        return classNames.join(' ');
    };


    var config = Flow.channel.run.getCurrentConfig();
    config.token = 'eyJhbGciOiJSUzI1NiJ9.eyJqdGkiOiI3YmM5MTI3My0yOGQzLTQyYWUtYTFhMy05YzEwYzg3ZmM0NTMiLCJzdWIiOiIwOTdlOTMzMC1mOWYyLTQ0MTAtYTY3My0wYTQwNzkyZjFkMTgiLCJzY29wZSI6WyJvYXV0aC5hcHByb3ZhbHMiLCJvcGVuaWQiXSwiY2xpZW50X2lkIjoibG9naW4iLCJjaWQiOiJsb2dpbiIsImdyYW50X3R5cGUiOiJwYXNzd29yZCIsInVzZXJfaWQiOiIwOTdlOTMzMC1mOWYyLTQ0MTAtYTY3My0wYTQwNzkyZjFkMTgiLCJ1c2VyX25hbWUiOiJucmFuaml0QGZvcmlvLmNvbSIsImVtYWlsIjoibnJhbmppdEBmb3Jpby5jb20iLCJwYXJlbnRfYWNjb3VudF9pZCI6bnVsbCwiaWF0IjoxNDQ5ODU3ODMwLCJleHAiOjE0NDk5MDEwMzAsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6OTc2My91YWEvb2F1dGgvdG9rZW4iLCJhdWQiOlsib2F1dGgiLCJvcGVuaWQiXX0.iE2FccE3UqWBSmTQxraz0Isyb5w17aki1Q_BY_yM0qvdVLxIPq17oCtY3u8cL2uqLeIqvyvH7WRUvccadbh1fOisPX-V2NyfJg0sV82ti_yy4McDW-7ja8ilwP1QDXzsCOlMs4xyfCnd9KyJ7DiwYbrK2uhMvxV3NtFaH3WbrDLptf128zl3olLHN3XuyB0gvXHnfeitgDh-J79Kl7gC8JkGNK5_q--FddjJFVQz-dTwsPMzGQt-Tro7Hu45ACyn07B4IaFqIggmOtR9cUD7pao_YNzgMetLQ5mMz3ExIasWciqQ8E32S6S6s_Jp_3CpyZdCwlUWumI8yeZTsS9TAg';
    var file = new F.service.File(config);
    var promise = file.getFileContents(config.model, 'model').then(function (x) {
        var ret = x.split(/\n/);
        return _.invoke(ret, 'trim');
    });

    var findContext = function (codeArray, variable) {
        var regExp = new RegExp('^' + variable + '\\s?=');
        var startIndex = _.findIndex(codeArray, function (val) {
            // console.log(val, regExp.test(val));
            return regExp.test(val);
        });
        var fromStart = codeArray.slice(startIndex + 1);
        var endIndex = _.findIndex(fromStart, function (val) {
            return val === '' || (val.indexOf('=') !== -1);
        });

        return codeArray.slice(startIndex, (startIndex + endIndex + 1));
    };

    $(function () {

        var canvas = drawModalCanvas();

        var $overlayContainer = $('<div class="f-item-containers"></div>');
        var elemCounter = 0;
        $(':f').each(function (index, elem) {
            elemCounter++;
            var $thisElemContainer = $('<div id="f-container-' + elemCounter + '"></div');

            var pos = $(elem).offset();
            $thisElemContainer.css({
                top: (pos.top - 25) + 'px',
                left: (pos.left) + 'px'
            });

            if (!$(elem).children().length) {
                eraseCanvas(canvas, pos.top, pos.left, $(elem).innerWidth(), $(elem).innerHeight(),  elem);
            }

            $(elem.attributes).each(function (index, nodeMap) {
                var attr = nodeMap.nodeName;
                var wantedPrefix = 'data-f-';
                if (attr.indexOf(wantedPrefix) === 0) {
                    attr = attr.replace(wantedPrefix, '');

                    var displayAttrName = attr.replace('on-', '');
                    var chain = _.invoke(nodeMap.value.split('|'), 'trim');
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

            $thisElemContainer.on('click', '.f-bind .f-val', function (evt) {
                var variableName = $(evt.target).text().trim();
                promise.then(function (data) {
                    console.log(findContext(data, variableName));
                });
            });

            $overlayContainer.append($thisElemContainer);
        });

        var evtName = 'f-select:type';
        addControlPanel($overlayContainer, evtName);
        $overlayContainer.on(evtName, function (evt, type) {
            $(root).toggleClass('hide-f-' + type);
        });
        $(root).prepend($overlayContainer);
    });


};

window.Flow.Inspector = FlowInspector;
module.exports = FlowInspector;
