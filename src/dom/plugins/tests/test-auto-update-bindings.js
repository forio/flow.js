import sinon from 'sinon';
import autoUpdate from '../auto-update-bindings';

describe('Update behavior', function () {
    it.skip('should call bind for added elements', function () {
        var $node = $('<div> </div>');
        var dummyDom = {
            bindAll: sinon.spy(),
            unbindAll: sinon.spy()
        };

        autoUpdate($node.get(0), dummyDom, true);
        var $sampleNode1 = $('<input type="text" data-f-bind="stuff" />');
        $node.append($sampleNode1);

        dummyDom.bindAll.should.have.been.calledOnce;
        dummyDom.bindAll.should.have.been.calledWith([$sampleNode1.get(0)]);
    });

    it('should call unbind for removed elements', function () {

    });

});
