var utils = require('../../testing-utils');
var domManager = require('src/dom/dom-manager');
var config = require('src/config');

describe('DOM Manager', function () {
    afterEach(function () {
        domManager.private.matchedElements.clear();
    });
    describe('#initialize', function () {
        describe('Selectors', function () {

            it('should select nothing by default', function () {
                return utils.initWithNode('<div></div>', domManager).then(function () {
                    domManager.private.matchedElements.size.should.equal(0);
                });
            });

            it('should select single nodes', function () {
                return utils.initWithNode('<input type="text" data-f-bind="stuff"/>', domManager).then(function ($node) {
                    domManager.private.matchedElements.size.should.equal(1);
                });
            });

            it('should select nested nodes', function () {
                return utils.initWithNode('<div data-f-bind="a"> <input type="text" data-f-bind="stuff"/> <span> nothing </span> </div>', domManager).then(function ($node) {
                    domManager.private.matchedElements.size.should.equal(2);
                });
            });

            it('should select nested nodes with diff F attrs', function () {
                return utils.initWithNode('<div data-f-a="a"> <input type="text" data-f-b="stuff"/> <span> nothing </span> </div>', domManager).then(function ($node) {
                    domManager.private.matchedElements.size.should.equal(2);
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
            require('./element-tests/test-generic-dom');

            require('./element-tests/test-button');
        });

        describe('Attribute Handlers', function () {
            require('./attributes/test-default-attr');
            require('./attributes/test-no-op-attr');
            require('./attributes/test-negative-boolean-attr');
            require('./attributes/test-positive-boolean-attr');
            require('./attributes/test-class-attr');
            require('./attributes/test-default-event-attribute');

            it('should allow handling custom attributes', function () {
                var toggle = function (value) {
                    if (value !== 1) {
                        this.css('display', 'none');
                    } else {
                        this.css('display', 'block');
                    }
                };
                var toggleSpy = sinon.spy(toggle);
                domManager.attributes.register('toggle', '*', toggleSpy);
                return utils.initWithNode('<input type="text" data-f-toggle="shouldIHide" data-f-bind="stuff"/>', domManager).then(function ($node) {
                    $node.trigger('update.f.model', { shouldIHide: 1 });

                    toggleSpy.should.have.been.called;
                    toggleSpy.should.have.been.calledWith(1);

                    $node.css('display').should.equal('block');

                    $node.trigger('update.f.model', { shouldIHide: 0 });
                    $node.css('display').should.equal('none');
                });
            });
        });

        describe('Node Handlers', function () {
            require('./nodes/test-node-manager');
        });

        require('./test-dom-converters');
    });

    describe('#bindElement', function () {
        it('should update list of added items if match', function () {
            domManager.private.matchedElements.size.should.equal(0);
            domManager.bindElement($('<input type="text" data-f-bind="boo" />'));
            domManager.private.matchedElements.size.should.equal(1);
        });
        it('should not update list of added items if match', function () {
            domManager.private.matchedElements.size.should.equal(0);
            domManager.bindElement($('<input type="text" data-bind="boo" />'));
            domManager.private.matchedElements.size.should.equal(0);
        });
        it('should not bind same item twice', function () {
            const $el = $('<input type="text" data-f-bind="boo" />');
            domManager.bindElement($el);
            domManager.private.matchedElements.size.should.equal(1);
            domManager.bindElement($el);
            domManager.private.matchedElements.size.should.equal(1);
        });

        describe('Subscriptions', ()=> {
            var channel;
            beforeEach(()=> {
                channel = utils.createDummyChannel();
            });
            describe('#bind', ()=> {
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
                it('add subscribption id to element', ()=> {
                    const $el = $('<div data-f-bind="a"><input type="text" data-f-bind="boo" /></div>');
                    const subsAttr = config.attrs.subscriptionId;
                    expect($el.data(subsAttr)).to.not.exist;
                    domManager.bindElement($el, channel);
                    expect($el.data(subsAttr)).to.exist;
                });

                it('should default to non-batch for single variable binds', ()=> {
                    const el = $('<div data-f-bind="a"> </div>');
                    domManager.bindElement(el, channel);

                    var args = channel.subscribe.getCall(0).args;
                    args[0].should.eql(['a']);
                    args[2].should.eql({ batch: false }); //args[1] is callback fn
                });
                it('should default to batch for multi variable binds', ()=> {
                    const el = $('<div data-f-bind="a, b"> </div>');
                    domManager.bindElement(el, channel);

                    var args = channel.subscribe.getCall(0).args;
                    args[0].should.eql(['a', 'b']);
                    args[2].should.eql({ batch: true }); //a
                });

                it('should pass in channel config', ()=> {
                    const $el = $('<div data-f-bind="a" data-f-channel-foo="bar"> </div>');
                    domManager.bindElement($el, channel);

                    var args = channel.subscribe.getCall(0).args;
                    args[0].should.eql(['a']);
                    args[2].should.eql({ batch: false, foo: 'bar' }); //args[1] is callback fn
                });
            });
        });
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

                domManager.private.matchedElements.size.should.equal(2);
                domManager.unbindElement(addedNode.get(0));
                domManager.private.matchedElements.size.should.equal(1);
            });
        });
        describe('Remove added data items', function () {
            it('should remove data items it adds', function () {
                return utils.initWithNode('<div data-f-bind="a | ##" data-f-other=" b | %"> </div>', domManager).then(function ($node) {
                    var keys = Object.keys($node.data());

                    var directTranslates = ['fConvertBind', 'fConvertOther', 'fOther', 'fBind'];
                    var flowAdded = ['subscriptionId', 'fAttrBindings'];
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
                    var directTranslates = ['fConvertBind', 'fConvertOther', 'fOther', 'fBind'];
                    var flowAdded = ['subscriptionId', 'fAttrBindings'];
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
                var nodes = `
                    <div data-f-bind="a">Hello <%= value %>! <span> some child <%= a %></span</div>
                `.trim();
                return utils.initWithNode(nodes, domManager).then(($node)=> {
                    var originalHTML = $node.html();

                    $node.trigger(config.events.channelDataReceived, { a: 'apple' });
                    var newhtml = $node.html();
                    expect(newhtml).to.equal('Hello apple! <span> some child apple</span>');
                    
                    domManager.unbindElement($node);
                    
                    expect($node.html()).to.equal(originalHTML);
                });
            });
            it('should remove templated foreach items', ()=> {
                var nodes = `
                    <ul data-f-foreach="fruits">
                        <li>Love <%= value %></li>
                    </ul>
                `.trim();
                return utils.initWithNode(nodes, domManager).then(($node)=> {
                    var originalHTML = $node.html();

                    $node.trigger(config.events.channelDataReceived, { fruits: ['apples', 'organges'] });
                    expect($node.children().length).to.equal(2);
                    
                    domManager.unbindElement($node);

                    expect($node.children().length).to.equal(1);
                    expect($node.html()).to.equal(originalHTML);
                });
            });
            it('should restore untemplated foreach items', ()=> {
                var nodes = `
                    <ul data-f-foreach="fruits">
                        <li>Foo</li>
                    </ul>
                `.trim();
                return utils.initWithNode(nodes, domManager).then(($node)=> {
                    var originalHTML = $node.html();

                    $node.trigger(config.events.channelDataReceived, { fruits: ['apples', 'organges'] });
                    expect($node.children().length).to.equal(2);
                    
                    domManager.unbindElement($node);

                    expect($node.children().length).to.equal(1);
                    expect($node.html()).to.equal(originalHTML);
                });
            });
            it('should remove templated repeat items', ()=> {
                var nodes = `
                    <ul>
                        <li data-f-repeat="fruits">Love <%= value %></li>
                    </ul>
                `.trim();
                return utils.initWithNode(nodes, domManager).then(($node)=> {
                    var originalHTML = $node.html();

                    $node.find('li:first').trigger(config.events.channelDataReceived, { fruits: ['apples', 'organges'] });
                    expect($node.children().length).to.equal(2);
                    
                    domManager.unbindElement($node.find('li:first'));

                    expect($node.children().length).to.equal(1);
                    expect($node.html()).to.equal(originalHTML);
                });
            });
        });
        describe('Subscriptions', ()=> {
            it('should call unsubscribe with subscriptionid', ()=> {
                const channel = utils.createDummyChannel();
                var node = utils.create(`<div data-f-bind="a" data-${config.attrs.subscriptionId}="goo" data-f-channel-foo="bar"> </div>`);
                domManager.unbindElement(node, channel);
                channel.unsubscribe.should.have.been.calledOnce;
                var args = channel.unsubscribe.getCall(0).args;
                args[0].should.eql('goo');
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
                domManager.private.matchedElements.size.should.equal(2);
                domManager.unbindAll();
                domManager.private.matchedElements.size.should.equal(0);
            });
        });
        it('should allow unbinding specified array of elements', function () {
            return utils.initWithNode('<div data-f-bind="a"> <input type="text" data-f-bind="boo" />  <input type="text" data-f-bind="boos" /> </div>', domManager).then(function ($node) {
                domManager.private.matchedElements.size.should.equal(3);
                domManager.unbindAll($node.find(':text').get(0));
                domManager.private.matchedElements.size.should.equal(2);
            });
        });
        it('should allow unbinding of children', function () {
            return utils.initWithNode('<div data-f-bind="a"> <input type="text" data-f-bind="boo" />  <input type="text" data-f-bind="boos" /> </div>', domManager).then(function ($node) {
                domManager.private.matchedElements.size.should.equal(3);
                domManager.unbindAll($node.get(0));
                domManager.private.matchedElements.size.should.equal(0);
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
                domManager.private.matchedElements.size.should.equal(1);

                $node.append('<input type="text" data-f-bind="boo" />');
                domManager.bindAll();
                domManager.private.matchedElements.size.should.equal(2);
            });
        });

        it('should allow providing list of elements to bind', function () {
            return utils.initWithNode('<div data-f-bind="a"> </div>', domManager).then(function ($node) {
                domManager.private.matchedElements.size.should.equal(1);

                $node.append('<input type="text" data-f-bind="boo" /> <input type="text" data-f-bind="boos" /> <input type="text" data-f-bind="booss" />');
                domManager.bindAll($node.find(':text').get().slice(0, 2));
                domManager.private.matchedElements.size.should.equal(3);
            });
        });
        it('should allow providing jquery selector', function () {
            return utils.initWithNode('<div data-f-bind="a"> </div>', domManager).then(function ($node) {
                domManager.private.matchedElements.size.should.equal(1);

                $node.append('<div> <input type="text" data-f-bind="boo" /> <input type="text" data-f-bind="boos" /> </div> <div> <input type="text" data-f-bind="booss" /> </div>');
                domManager.bindAll($node.find('div').get(0));
                domManager.private.matchedElements.size.should.equal(3);
            });
        });
    });

    require('./test-dom-events');
});
