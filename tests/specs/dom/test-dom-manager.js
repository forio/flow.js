import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));


var utils = require('../../testing-utils');
var domManager = require('../../../src/dom/dom-manager').default;

describe('DOM Manager', function () {
    beforeEach(function () {
        domManager.matchedElements.clear();
    });
    describe('#initialize', function () {
        describe('Selectors', function () {
            it('should select nothing by default', function () {
                return utils.initWithNode('<div></div>', domManager).then(function () {
                    domManager.matchedElements.size.should.equal(0);
                });
            });

            it('should select single nodes', function () {
                return utils.initWithNode('<input type="text" data-f-bind="stuff"/>', domManager).then(function ($node) {
                    domManager.matchedElements.size.should.equal(1);
                });
            });

            it('should select nested nodes', function () {
                return utils.initWithNode('<div data-f-bind="a"> <input type="text" data-f-bind="stuff"/> <span> nothing </span> </div>', domManager).then(function ($node) {
                    domManager.matchedElements.size.should.equal(2);
                });
            });

            it('should select nested nodes with diff F attrs', function () {
                return utils.initWithNode('<div data-f-a="a"> <input type="text" data-f-b="stuff"/> <span> nothing </span> </div>', domManager).then(function ($node) {
                    domManager.matchedElements.size.should.equal(2);
                });
            });
        });

        describe('DOM Elements', function () {
            it('should bubble change events', function () {
                var nested = [
                    '<div data-f-a="a">',
                    '   <div class="abc">',
                    '       <input type="text" data-f-bind="stuff"/>',
                    '   </div>',
                    '   <span> nothing </span>',
                    '</div>'
                ];
                return utils.initWithNode(nested.join(), domManager).then(function ($node) {
                    var $textNode = $node.find(':text');

                    var textspy = sinon.spy();
                    $textNode.on('update.f.ui', textspy);

                    var parentSpy = sinon.spy();
                    $node.find('.abc').on('update.f.ui', parentSpy);

                    var rootSpy = sinon.spy();
                    $node.on('update.f.ui', rootSpy);


                    $textNode.trigger('change');
                    textspy.should.have.been.calledOnce;
                    parentSpy.should.have.been.calledOnce;
                    rootSpy.should.have.been.calledOnce;
                });
            });

            require('./element-tests/test-checkbox');
            require('./element-tests/test-radio-button');
            require('./element-tests/test-text');
            require('./element-tests/test-select');
            require('./element-tests/test-button');
        });

        describe('Attribute Handlers', function () {
            it('should allow handling custom attributes', function () {
                var toggle = function (value, prop, $el) {
                    if (value !== 1) {
                        $el.css('display', 'none');
                    } else {
                        $el.css('display', 'block');
                    }
                };
                var toggleSpy = sinon.spy(toggle);
                domManager.attributes.register('toggle', '*', toggleSpy);
                const channel = utils.createDummyChannel();
                return utils.initWithNode('<input type="text" data-f-toggle="shouldIHide" data-f-bind="stuff"/>', domManager, channel).then(function ($node) {
                    return channel.publish({ shouldIHide: 1 }).then(()=> {
                        toggleSpy.should.have.been.called;
                        toggleSpy.should.have.been.calledWith(1);

                        $node.css('display').should.equal('block');
                        return channel.publish({ shouldIHide: 0 }).then(()=> {
                            $node.css('display').should.equal('none');
                        });
                    });
                });
            });
        });

        
        require('./test-dom-converters');
    });
    describe('#unbindElement', function () {
        it('should unbindElement elements added to the dom', function () {
            return utils.initWithNode('<div data-f-bind="a"> <input type="text" data-f-bind="boo" /> </div>', domManager).then(function ($node) {
                var addedNode = $node.find(':text');

                var textspy = sinon.spy();
                $(addedNode).on('update.f.ui', textspy);

                $(addedNode).val('hello').trigger('change');
                textspy.should.have.been.calledOnce;

                domManager.unbindElement(addedNode.get(0));

                $(addedNode).val('hello1').trigger('change');
                textspy.should.have.been.calledOnce;
            });
        });
        it('should update list of added items', function () {
            return utils.initWithNode('<div data-f-bind="a"> <input type="text" data-f-bind="boo" /> </div>', domManager).then(function ($node) {
                var addedNode = $node.find(':text');

                domManager.matchedElements.size.should.equal(2);
                domManager.unbindElement(addedNode.get(0));
                domManager.matchedElements.size.should.equal(1);
            });
        });
        describe('Remove added data items', function () {
            it('should remove data items it adds', function () {
                return utils.initWithNode('<div data-f-bind="a | ##" data-f-other=" b | %"> </div>', domManager).then(function ($node) {
                    var keys = Object.keys($node.data());

                    var directTranslates = ['fOther', 'fBind'];
                    var flowAdded = [];
                    var toMatch = [].concat(directTranslates).concat(flowAdded);
                    keys.sort().should.eql(toMatch.sort());

                    domManager.unbindElement($node.get(0));

                    var newkeys = Object.keys($node.data());
                    newkeys.should.eql([]);
                });
            });

            it('should not remove data items it doesn\'t add', function () {
                return utils.initWithNode('<div data-f-bind="a | ##" data-f-other=" b | %" data-my-stuff="1" data-fsomething="1"> </div>', domManager).then(function ($node) {
                    var keys = Object.keys($node.data());

                    var notAddedByFlow = ['myStuff', 'fsomething'];
                    var directTranslates = ['fOther', 'fBind'];
                    var flowAdded = [];
                    var toMatch = [].concat(directTranslates).concat(flowAdded).concat(notAddedByFlow);
                    keys.sort().should.eql(toMatch.sort());

                    domManager.unbindElement($node);

                    var newkeys = Object.keys($node.data());
                    (newkeys.sort()).should.eql(notAddedByFlow.sort());
                });
            });
        });
        describe('remove items generated through templates', ()=> {
            it('should remove templated bind items', ()=> {
                const channel = utils.createDummyChannel();
                var nodes = `
                    <div data-f-bind="a">Hello <%= value %>! <span> some child <%= a %></span</div>
                `.trim();
                var originalHTML = $(nodes).html();
                return utils.initWithNode(nodes, domManager, channel).then(($node)=> {
                    return channel.publish({ a: 'apple' }).then(()=> {
                        var newhtml = $node.html();
                        expect(newhtml).to.equal('Hello apple! <span> some child apple</span>');
                        
                        domManager.unbindElement($node);
                        
                        expect($node.html()).to.equal(originalHTML);
                    });
                });
            });
            it('should remove templated foreach items', ()=> {
                var nodes = `
                    <ul data-f-foreach="fruits">
                        <li>Love <%= value %></li>
                    </ul>
                `.trim();
                const channel = utils.createDummyChannel();

                return utils.initWithNode(nodes, domManager, channel).then(($node)=> {
                    var originalHTML = $node.html();

                    return channel.publish({ fruits: ['apples', 'organges'] }).then(()=> {
                        expect($node.children().length).to.equal(2);
                        
                        domManager.unbindElement($node);

                        expect($node.children().length).to.equal(1);
                        expect($node.html()).to.equal(originalHTML);
                    });
                });
            });
            it('should restore untemplated foreach items', ()=> {
                var nodes = `
                    <ul data-f-foreach="fruits">
                        <li>Foo</li>
                    </ul>
                `.trim();
                const channel = utils.createDummyChannel();
                return utils.initWithNode(nodes, domManager, channel).then(($node)=> {
                    var originalHTML = $node.html();

                    return channel.publish({ fruits: ['apples', 'organges'] }).then(()=> {
                        expect($node.children().length).to.equal(2);
                        
                        domManager.unbindElement($node);

                        expect($node.children().length).to.equal(1);
                        expect($node.html()).to.equal(originalHTML);
                    });
                });
            });
            it('should remove templated repeat items', ()=> {
                var nodes = `
                    <ul>
                        <li data-f-repeat="fruits">Love <%= value %></li>
                    </ul>
                `.trim();
                const channel = utils.createDummyChannel();
                return utils.initWithNode(nodes, domManager, channel).then(($node)=> {
                    var originalHTML = $node.html();

                    return channel.publish({ fruits: ['apples', 'organges'] }).then(()=> {
                        expect($node.children().length).to.equal(2);
                        
                        domManager.unbindElement($node.find('li:first'));

                        expect($node.children().length).to.equal(1);
                        expect($node.html()).to.equal(originalHTML);
                    });
                });
            });
        });
        describe('Subscriptions', ()=> {
            it('should call unsubscribe with subscriptionid', ()=> {
                const channel = utils.createDummyChannel();
                var node = utils.create('<div data-f-bind="a" data-f-channel-foo="bar"> </div>');
                domManager.bindElement(node, channel);
                domManager.unbindElement(node, channel);

                channel.unsubscribe.should.have.been.calledOnce;
                var args = channel.unsubscribe.getCall(0).args;
                expect(typeof args[0]).to.equal('string');
            });
        });
    });

    describe('#unbindAll', function () {
        it('should unbindElement all elements added to the dom', function () {
            return utils.initWithNode('<div data-f-bind="a"> <input type="text" data-f-bind="boo" /> </div>', domManager).then(function ($node) {
                var addedNode = $node.find(':text');

                var textspy = sinon.spy();
                $(addedNode).on('update.f.ui', textspy);

                $(addedNode).val('hello').trigger('change');
                textspy.should.have.been.calledOnce;

                domManager.unbindAll();

                $(addedNode).val('hello1').trigger('change');
                textspy.should.have.been.calledOnce;
            });
        });
        it('should update list of added items', function () {
            return utils.initWithNode('<div data-f-bind="a"> <input type="text" data-f-bind="boo" /> </div>', domManager).then(function ($node) {
                domManager.matchedElements.size.should.equal(2);
                domManager.unbindAll();
                domManager.matchedElements.size.should.equal(0);
            });
        });
        it('should allow unbinding specified array of elements', function () {
            return utils.initWithNode('<div data-f-bind="a"> <input type="text" data-f-bind="boo" />  <input type="text" data-f-bind="boos" /> </div>', domManager).then(function ($node) {
                domManager.matchedElements.size.should.equal(3);
                domManager.unbindAll($node.find(':text').get(0));
                domManager.matchedElements.size.should.equal(2);
            });
        });
        it('should allow unbinding of children', function () {
            return utils.initWithNode('<div data-f-bind="a"> <input type="text" data-f-bind="boo" />  <input type="text" data-f-bind="boos" /> </div>', domManager).then(function ($node) {
                domManager.matchedElements.size.should.equal(3);
                domManager.unbindAll($node.get(0));
                domManager.matchedElements.size.should.equal(0);
            });
        });
    });
    describe('#bindAll', function () {
        it('should bind elements from the root if no selector is provided', function () {
            return utils.initWithNode('<div data-f-bind="a"> </div>', domManager).then(function ($node) {
                $node.append('<input type="text" data-f-bind="boo" />');
                var addedNode = $node.find(':text');

                var textspy = sinon.spy();
                $(addedNode).on('update.f.ui', textspy);

                $(addedNode).val('hello').trigger('change');
                textspy.should.not.have.been.called;

                domManager.bindAll();

                $(addedNode).val('hello1').trigger('change');
                textspy.should.have.been.calledOnce;
            });
        });

        it('should bind children of added elements', function () {
            return utils.initWithNode('<div> </div>', domManager).then(function ($node) {
                $node.append('<input type="text" data-f-bind="boo" />');
                var addedNode = $node.find(':text');

                var textspy = sinon.spy();
                $(addedNode).on('update.f.ui', textspy);

                $(addedNode).val('hello').trigger('change');
                textspy.should.not.have.been.called;

                domManager.bindAll($node);

                $(addedNode).val('hello1').trigger('change');
                textspy.should.have.been.calledOnce;
            });
        });

        it('should update list of added items', function () {
            return utils.initWithNode('<div data-f-bind="a"> </div>', domManager).then(function ($node) {
                domManager.matchedElements.size.should.equal(1);

                $node.append('<input type="text" data-f-bind="boo" />');
                domManager.bindAll();
                domManager.matchedElements.size.should.equal(2);
            });
        });

        it('should allow providing list of elements to bind', function () {
            return utils.initWithNode('<div data-f-bind="a"> </div>', domManager).then(function ($node) {
                domManager.matchedElements.size.should.equal(1);

                $node.append('<input type="text" data-f-bind="boo" /> <input type="text" data-f-bind="boos" /> <input type="text" data-f-bind="booss" />');
                domManager.bindAll($node.find(':text').get().slice(0, 2));
                domManager.matchedElements.size.should.equal(3);
            });
        });
        it('should allow providing jquery selector', function () {
            return utils.initWithNode('<div data-f-bind="a"> </div>', domManager).then(function ($node) {
                domManager.matchedElements.size.should.equal(1);

                $node.append('<div> <input type="text" data-f-bind="boo" /> <input type="text" data-f-bind="boos" /> </div> <div> <input type="text" data-f-bind="booss" /> </div>');
                domManager.bindAll($node.find('div').get(0));
                domManager.matchedElements.size.should.equal(3);
            });
        });
        it('should allow overriding change events', function () {
            return utils.initWithNode(`<div>
                <input id="ip1" data-f-bind="hoo" />
                <input id="ip2" data-f-bind="door" />
            </div>`, domManager, null, {
                uiChangeEvents: {
                    '#ip2': 'click'
                }
            }).then(function ($node) {

                var textspy = sinon.spy();
                $node.on('update.f.ui', textspy);

                domManager.bindAll($node.find('div').get(0));
                $node.find('#ip1').trigger('change');

                expect(textspy).to.have.been.calledOnce;

                $node.find('#ip2').trigger('change');
                expect(textspy).to.have.been.calledOnce;

                $node.find('#ip2').trigger('click');
                expect(textspy).to.have.been.calledTwice;
            });
        });
    });
});
