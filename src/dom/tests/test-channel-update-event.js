import domManager from 'dom/dom-manager';
import { createDummyChannel, initWithNode } from 'tests/testing-utils';

import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));


describe('On Channel updates', function () {
    it('should trigger f.convert with multiple attributes if provided an object with multiple keys', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-stuff="apple" data-f-other="orange"/>', domManager, channel).then(function ($node) {
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            return channel.publish({
                apple: 'sauce',
                orange: 'pie'
            }).then(()=> {
                spy.should.have.been.calledTwice;
                spy.getCall(0).args[1].should.eql({
                    stuff: 'sauce',
                });
                spy.getCall(1).args[1].should.eql({
                    other: 'pie',
                });
            });
        });
    });
    it('should trigger f.convert with single attribute if provided an object with same keys', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-stuff="apple" data-f-other="apple"/>', domManager, channel).then(function ($node) {
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            return channel.publish({
                apple: 'sauce'
            }).then(()=> {
                spy.should.have.been.calledTwice;
                spy.getCall(0).args[1].should.eql({
                    stuff: 'sauce',
                });
                spy.getCall(1).args[1].should.eql({
                    other: 'sauce',
                });
            });
        });
    });
    it('should trigger f.convert with an object if provided an object with multiple keys', function () {
        const channel = createDummyChannel();
        return initWithNode('<input type="text" data-f-stuff="apple, orange"/>', domManager, channel).then(function ($node) {
            var spy = sinon.spy();
            $node.on('f.convert', spy);

            var data = {
                apple: 'sauce',
                orange: 'pie'
            };
            return channel.publish(data).then(()=> {
                spy.getCall(0).args[1].should.eql({
                    stuff: data
                });
            });
        });
    });
    describe('De-prefix variables', ()=> {
        it('should leave single vars as-is', ()=> {
            const channel = createDummyChannel();
            return initWithNode('<input type="text" data-f-stuff="c1:apple"/>', domManager, channel).then(function ($node) {
                var spy = sinon.spy();
                $node.on('f.convert', spy);

                var data = {
                    'c1:apple': 'sauce',
                };
                return channel.publish(data).then(()=> {
                    spy.getCall(0).args[1].should.eql({
                        stuff: 'sauce'
                    });
                });
            });
        });
        it('should deprefix multivariables if channel provided externally', ()=> {
            const channel = createDummyChannel();
            return initWithNode('<input type="text" data-f-stuff="apple,bread" data-f-channel="c1" />', domManager, channel).then(function ($node) {
                var spy = sinon.spy();
                $node.on('f.convert', spy);

                var data = {
                    'c1:apple': 'sauce',
                    'c1:bread': 'pudding',
                };
                return channel.publish(data).then(()=> {
                    spy.getCall(0).args[1].should.eql({
                        stuff: {
                            apple: 'sauce',
                            bread: 'pudding'
                        }
                    });
                });
            });
        });
        it('should not deprefix multivariables if channel provided inline', ()=> {
            const channel = createDummyChannel();
            return initWithNode('<input type="text" data-f-stuff="c1:apple,c1:bread" />', domManager, channel).then(function ($node) {
                var spy = sinon.spy();
                $node.on('f.convert', spy);

                var data = {
                    'c1:apple': 'sauce',
                    'c1:bread': 'pudding',
                };
                return channel.publish(data).then(()=> {
                    spy.getCall(0).args[1].should.eql({
                        stuff: data
                    });
                });
            });
        });
    });
});
