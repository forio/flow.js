var NodeClass = require('src/dom/nodes/default-input-node');
var make = require('../../testing-utils').create;

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
    });
});
