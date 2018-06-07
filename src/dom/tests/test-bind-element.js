import domManager from '../dom-manager';
import { createDummyChannel } from '../../../tests/testing-utils';

import chai from 'chai';
chai.use(require('sinon-chai'));
const { expect } = chai;

describe('DOM Manager #bindElement', function () {
    var channel;
    beforeEach(function () {
        channel = createDummyChannel();
        domManager.matchedElements.clear();
    });

    it('should update list of added items if match', function () {
        domManager.matchedElements.size.should.equal(0);
        domManager.bindElement($('<input type="text" data-f-bind="boo" />'), channel);
        domManager.matchedElements.size.should.equal(1);
    });
    it('should not update list of added items if match', function () {
        domManager.matchedElements.size.should.equal(0);
        domManager.bindElement($('<input type="text" data-bind="boo" />'), channel);
        domManager.matchedElements.size.should.equal(0);
    });
    it('should not bind same item twice', function () {
        const $el = $('<input type="text" data-f-bind="boo" />');
        domManager.bindElement($el, channel);
        domManager.matchedElements.size.should.equal(1);
        domManager.bindElement($el, channel);
        domManager.matchedElements.size.should.equal(1);
    });

    describe('Subscriptions', ()=> {
        describe('default', ()=> {
            it('should subscribe single elements', ()=> {
                const el = $('<div data-f-bind="a"> </div>');
                domManager.bindElement(el, channel);
                expect(channel.subscribe).to.have.been.calledOnce;
                expect(channel.subscribe).to.have.been.calledWith(['a']);
            });
            it('should only subscribe for top-level elements', ()=> {
                const el = $('<div data-f-bind="a"><input type="text" data-f-bind="boo" /></div>');
                domManager.bindElement(el, channel);
                expect(channel.subscribe).to.have.been.calledOnce;
                expect(channel.subscribe).to.have.been.calledWith(['a']);
            });
            it('should default to batch for multi variable binds', ()=> {
                const el = $('<div data-f-bind="a, b"> </div>');
                domManager.bindElement(el, channel);

                var args = channel.subscribe.getCall(0).args;
                args[0].should.eql(['a', 'b']);
                args[2].batch.should.eql(true); //a
            });

            it('should pass in channel config', ()=> {
                const $el = $('<div data-f-bind="a" data-f-channel-foo="bar"> </div>');
                domManager.bindElement($el, channel);

                var args = channel.subscribe.getCall(0).args;
                args[0].should.eql(['a']);
                args[2].foo.should.eql('bar'); //args[1] is callback fn
            });
        });
        describe('Channel Prefix', ()=> {
            describe('Prefix', ()=> {
                it('should add channel prefix if provided on itself', ()=> {
                    const el = $('<div data-f-bind="a" data-f-channel="foo"> </div>');
                    domManager.bindElement(el, channel);

                    expect(channel.subscribe).to.have.been.calledOnce;
                    expect(channel.subscribe).to.have.been.calledWith(['foo:a']);
                });
                it('should add channel prefix if defined on parent', ()=> {
                    const el = $(`
                            <div data-f-channel="foo">
                                <div data-f-bind="a"></div>
                            </div>
                        `);

                    domManager.bindElement($(el).find('div'), channel);

                    expect(channel.subscribe).to.have.been.calledOnce;
                    expect(channel.subscribe).to.have.been.calledWith(['foo:a']);
                });
                it('should apply to all attrs on element', ()=> {
                    const el = $(`
                            <div data-f-channel="foo">
                                <div data-f-bind="a" data-f-foo="bar"></div>
                            </div>
                        `);

                    domManager.bindElement($(el).find('div'), channel);

                    expect(channel.subscribe).to.have.been.calledTwice;

                    const args1 = channel.subscribe.getCall(0).args[0];
                    expect(args1).to.eql(['foo:a']);

                    const args2 = channel.subscribe.getCall(1).args[0];
                    expect(args2).to.eql(['foo:bar']);
                });
                it('should not add a prefix if already defined', ()=> {
                    const el = $(`
                            <div data-f-channel="foo">
                                <div data-f-bind="prefix:a" data-f-foo="bar"></div>
                            </div>
                        `);

                    domManager.bindElement($(el).find('div'), channel);

                    expect(channel.subscribe).to.have.been.calledTwice;

                    const args1 = channel.subscribe.getCall(0).args[0];
                    expect(args1).to.eql(['prefix:a']);

                    const args2 = channel.subscribe.getCall(1).args[0];
                    expect(args2).to.eql(['foo:bar']);
                });
            });
        });
        describe('Channel options', ()=> {
            it('should provide channeloptions for channels defined as attrs', ()=> {
                const el = $('<div data-f-bind="a" data-f-channel="foo" data-f-channel-a="1"> </div>');
                domManager.bindElement(el, channel);

                const opts = channel.subscribe.getCall(0).args[2];
                expect(opts.a).to.eql('1');
            });
            it('should provide channeloptions for inline channels', ()=> {
                const el = $('<div data-f-bind="a" data-f-channel-a="1"> </div>');
                domManager.bindElement(el, channel);

                const opts = channel.subscribe.getCall(0).args[2];
                expect(opts.a).to.eql('1');
            });
        });
    });
});
