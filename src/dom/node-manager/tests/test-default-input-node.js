import NodeClass from '../default-input-node';
import sinon from 'sinon';

import { create as make } from 'tests/testing-utils';

describe('Input node', function () {
    var textNode;
    var makeView;
    before(function () {
        textNode = make('<input type="text" data-f-bind="stuff"/>');

        makeView = function (str) {
            var node = make(str);
            var nodeView = new NodeClass({ el: node });
            return nodeView;
        };
    });

    after(function () {
        textNode = makeView = null;
    });

    describe('#initialize', function () {
        it('should attach event handlers if \'bind\' is specified', function () {
            var $el = $('<input type="text" data-f-bind="stuff" />');
            new NodeClass({
                $el: $el
            });

            var s = sinon.spy();
            $el.on('update.f.ui', s);

            $el.val('hello').trigger('change');

            s.should.have.been.called;
        });

        it('should not attach event handlers if \'bind\' is not specified', function () {
            var $el = $('<input type="text" value="4" />');
            new NodeClass({
                $el: $el
            });

            var s = sinon.spy();
            $el.on('update.f.ui', s);

            $el.val('hello').trigger('change');

            s.should.not.have.been.called;
        });
    });

    describe('#removeEvents', function () {
        it('should remove events', function () {
            var $el = $('<input type="text" data-f-bind="stuff" />');
            var n = new NodeClass({
                $el: $el
            });

            var s = sinon.spy();
            $el.on('update.f.ui', s);
            $el.val('hello').trigger('change');

            s.should.have.been.calledOnce;
            n.removeEvents();

            $el.val('hello').trigger('change');
            s.should.have.been.calledOnce;
        });
    });

    describe('selector', function () {
        it('should claim input nodes', function () {
            var claimed = $(textNode).is(NodeClass.selector);
            claimed.should.be.true;
        });
        it('should claim select nodes', function () {
            var node = make('<select> <option> 1 </option> </select>');
            var claimed = $(node).is(NodeClass.selector);
            claimed.should.be.true;
        });
        it('should claim checkboxes', function () {
            var node = make('<input type="checkbox" data-f-bind="stuff"/>');
            var claimed = $(node).is(NodeClass.selector);
            claimed.should.be.true;
        });
        it('should claim radio buttons', function () {
            var node = make('<input type="radio" data-f-bind="stuff"/>');
            var claimed = $(node).is(NodeClass.selector);
            claimed.should.be.true;
        });
        it('should claim textareas', function () {
            var node = make('<textarea data-f-bind="stuff"></textarea>');
            var claimed = $(node).is(NodeClass.selector);
            claimed.should.be.true;
        });
        it('should not claim divs', function () {
            var node = make('<div> stuff </div>');
            var claimed = $(node).is(NodeClass.selector);
            claimed.should.be.false;
        });
    });

    describe('getUIValue', function () {
        it('should get value of textboxes as strings', function () {
            var nv = makeView('<input type="text" value="5" data-f-bind="stuff"/>');
            var val = nv.getUIValue();
            val.should.equal('5');
        });
        it('should get value of textareas with line breaks', ()=> {
            var textStr = 'foo\nbar\r\nsdfsd';
            var nv = makeView(`<textarea data-f-bind="stuff">${textStr}</textarea>`);
            var val = nv.getUIValue();
            val.should.equal('foo\nbar\nsdfsd'); //jquery strips out /rs, which okay because /ns are stored anyway
        });
    });
});
