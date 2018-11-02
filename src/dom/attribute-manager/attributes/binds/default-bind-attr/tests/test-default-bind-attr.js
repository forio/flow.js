import bindHandler from '../index';

describe('Default Bind', function () {
    describe('#handle', function () {
        describe('Non-templated', function () {
            it('should replace innerhtml if target is blank', function () {
                var $rootNode = $('<div> </div>');
                bindHandler.handle('Hello', 'bind', $rootNode, []);
                $rootNode.html().should.equal('Hello');
            });
            it('should replace innerhtml if target has random text', function () {
                var $rootNode = $('<div> Loading </div>');
                bindHandler.handle('Hello', 'bind', $rootNode, []);
                $rootNode.html().should.equal('Hello');
            });
            it('should show the last item if given an array', function () {
                it('should replace innerhtml if target has random text', function () {
                    var $rootNode = $('<div> Loading </div>');
                    bindHandler.handle([1, 3, 5, 6], 'bind', $rootNode, []);
                    $rootNode.html().should.equal('6');
                });
            });
            it('should stringify objects if passed in', function () {
                var $rootNode = $('<div> Loading </div>');
                var data = { hello: 'world' };
                bindHandler.handle(data, 'bind', $rootNode, []);
                $rootNode.html().should.equal(JSON.stringify(data));
            });

        });
        describe('Templated', function () {
            it('should show values for single items', function () {
                var $rootNode = $('<div><%= value %> World</div>');
                bindHandler.handle('Hello', 'bind', $rootNode, []);
                $rootNode.html().should.equal('Hello World');
            });
            it('should show templatize Objects', function () {
                var $rootNode = $('<div><%= a %> <%= b %></div>');
                bindHandler.handle({ a: 'Hello', b: 'World' }, 'bind', $rootNode, []);
                $rootNode.html().should.equal('Hello World');
            });
            it('should show handle variables with spaces', function () {
                var $rootNode = $('<div><%= a %> <%= value["b c"] %></div>');
                bindHandler.handle({ a: 'Hello', 'b c': 'World' }, 'bind', $rootNode, []);
                $rootNode.html().should.equal('Hello World');
            });
            it('should show templatize Arrays', function () {
                var $rootNode = $('<div><%= value[value.length - 1] %></div>');
                bindHandler.handle(['Hello'], 'bind', $rootNode, []);
                $rootNode.html().should.equal('Hello');
            });
            it('should show stringified Arrays', function () {
                var $rootNode = $('<div><%= value %></div>');
                bindHandler.handle(['Hello', 'there', 'world'], 'bind', $rootNode, []);
                $rootNode.html().should.equal('Hello,there,world');
            });
            it('should treat items as js objects', function () {
                var $rootNode = $('<div><%= words.join(",") %></div>');
                bindHandler.handle({ words: ['Hello', 'there', 'world'] }, 'bind', $rootNode, []);
                $rootNode.html().should.equal('Hello,there,world', 'bind', $rootNode, []);
            });

            it('should update templates when called multiple times', function () {
                var $rootNode = $('<div><%= value %> World</div>');
                bindHandler.handle('Hello', 'bind', $rootNode, []);
                $rootNode.html().should.equal('Hello World');
                bindHandler.handle('Mario', 'bind', $rootNode, []);
                $rootNode.html().should.equal('Mario World');
            });

            it('should ignore items it doesn\'t know', ()=> {
                var $rootNode = $(`
                    <div><%= value %> World<span><%= foo %></span></div>
                `);
                bindHandler.handle('Hello', 'bind', $rootNode, []);
                $rootNode.html().trim().should.equal(`
                    Hello World<span>&lt;%= foo %&gt;</span>
                `.trim());
            });
        });
    });
    
    //S FIXME in default-bind
    // describe('#init', ()=> {
    //     it('should remove contents if it\'s template', ()=> {
    //         const $el = $('<div><%= value %> World</div>');
    //         bindHandler.init('bind', 'stuff', $el);
    //         expect($el.html()).to.equal('');
    //     });
    //     it('should return true', ()=> {
    //         const $el = $('<div><%= value %> World</div>');
    //         const ret = bindHandler.init('bind', 'stuff', $el);
    //         expect(ret).to.equal(true);
    //     });
    //     it('should leave contents as-is if not templated', ()=> {
    //         const $el = $('<div>Hello World</div>');
    //         bindHandler.init('bind', 'stuff', $el);
    //         expect($el.html()).to.equal('Hello World');
    //     });
    // });
});
