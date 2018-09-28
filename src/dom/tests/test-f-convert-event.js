import domManager from '../dom-manager';
import { createDummyChannel, initWithNode } from '../../../tests/testing-utils';

import chai from 'chai';
const { expect } = chai;

describe('f.convert', function () {
    it('should work if triggered with literal', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-bind="price" data-f-stuff="43 | $0.00" />', domManager, channel).then(function ($node) {
            $node.trigger('f.convert', { stuff: '43' });
            $node.prop('stuff').should.equal('$43.00');
        });
    });
    it('should work if triggered with value objects', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-bind="price" data-f-stuff="a,b" />', domManager, channel).then(function ($node) {
            var data = { a: 1, b: 2 };
            $node.trigger('f.convert', { stuff: data });
            $node.prop('stuff').should.eql(data);
        });
    });
    it('should work if triggered with value objects piped to converters', function () {
        var channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-bind="price" data-f-stuff="a,b | s" />', domManager, channel).then(function ($node) {
            var data = { a: 1, b: 2 };
            $node.trigger('f.convert', { stuff: data });
            $node.prop('stuff').should.eql({ a: '1', b: '2' });
        });
    });
});
