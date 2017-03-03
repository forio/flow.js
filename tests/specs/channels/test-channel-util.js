var utils = require('src/channels/channel-utils');

describe('Channel Utils', ()=> {
    describe('#normalizeParamOptions', ()=> {
        var convert = utils.normalizeParamOptions;

        it('should convert arrays', ()=> {
            var input = [{ name: 'foo', value: 'bar' }];
            var options = { foo: 'bah' };
            var output = convert(input, options);
            var expectedOutput = { params: input, options: options };

            expect(output).to.eql(expectedOutput);
        });
        it('should convert objects', ()=> {
            var input = { a: 1, b: 'good' };
            var options = { foo: 'bah' };
            var output = convert(input, options);
            var expectedOutput = { 
                params: [{ name: 'a', value: 1 }, { name: 'b', value: 'good' }], 
                options: options 
            };

            expect(output).to.eql(expectedOutput);
        });
        it('should convert key, value pairs', ()=> {
            var options = { foo: 'bah' };
            var output = convert('a', 1, options);
            var expectedOutput = { 
                params: [{ name: 'a', value: 1 }], 
                options: options 
            };

            expect(output).to.eql(expectedOutput);
        });
    });
    describe('#findBestHandler', ()=> {
        var findBestHandler = utils.findBestHandler;
        it('should return first handler which matches', ()=> {
            var handlers = [
                { name: 'a', match: (v)=> v.indexOf('a') === 0 ? 'a' : false },
                { name: 'a2', match: (v)=> v.indexOf('a') === 0 ? 'a' : false },
            ];
            
            var best = findBestHandler('a', handlers);
            expect(best.name).to.eql('a');
        });
        it('should return the right prefix', ()=> {
            var handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
                { match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
            ];
            
            var best = findBestHandler('a', handlers);
            expect(best.match).to.eql('foo');
        });
    });
    describe('#groupByHandlers', ()=> {
        var groupByHandlers = utils.groupByHandlers;
        it('should group arrays', ()=> {
            var handlers = [
               { match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
               { match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
               { match: (v)=> v.indexOf('c') === 0 ? 'cat' : false },
            ];
            var data = ['apple', 'apples', 'banana', 'amazon'];
            var op = groupByHandlers(data, handlers);
            expect(op.length).to.eql(2);
            expect(op[0].name).to.eql(handlers[0].name);
            expect(op[0].data).to.eql(['apple', 'apples', 'amazon']);

            expect(op[1].name).to.eql(handlers[1].name);
            expect(op[1].data).to.eql(['banana']);
        });
        // it('should strip out prefixes', ()=> {
        //     var handlers = [
        //        { match: (v)=> v.indexOf('a') === 0 ? 'a' : false },
        //        { match: (v)=> v.indexOf('b') === 0 ? 'b' : false },
        //        { match: (v)=> v.indexOf('c') === 0 ? 'c' : false },
        //     ];
        //     var data = ['apple', 'apples', 'bar', 'amazon'];
        //     var op = groupByHandlers(data, handlers);
        //     expect(op[0].name).to.eql(handlers[0].name);
        //     expect(op[0].topics).to.eql(['pple', 'pples', 'mazon']);
        //     expect(op[1].topics).to.eql(['ar']);
        // });

        it('should pass through additional handler props', ()=> {
            var handlers = [
               { foo: 'bar', match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
               { bat: 'man', match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
            ];
            var data = ['apple', 'banana'];
            var op = groupByHandlers(data, handlers);
            expect(op[0].foo).to.eql(handlers[0].foo);
            expect(op[1].bat).to.eql(handlers[1].bat);
        });
    });
    describe('#groupSequentiallyByHandlers', ()=> {
        var groupSequentiallyByHandlers = utils.groupSequentiallyByHandlers;
        it('should group arrays', ()=> {
            var data = [
               { name: 'apple' },
               { name: 'apples' },
               { name: 'bar' },
               { name: 'amazon' },
            ];
            var handlers = [
               { match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
               { match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
            ];
            var op = groupSequentiallyByHandlers(data, handlers);
            expect(op.length).to.eql(3);
            expect(op[0].name).to.eql(handlers[0].name);
            expect(op[1].name).to.eql(handlers[1].name);
            expect(op[2].name).to.eql(handlers[0].name);
        });
        it('should pass through additional data pts', ()=> {
            var data = [
               { name: 'apple', clark: 'kent' },
               { name: 'bar', tony: 'stark' },
            ];
            var handlers = [
               { match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
               { match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
            ];
            var op = groupSequentiallyByHandlers(data, handlers);
            expect(op[0].clark).to.eql(handlers[1].clark);
            expect(op[1].tony).to.eql(handlers[0].tony);
        });
        // it('should strip prefixes', ()=> {
        //     var data = [
        //        { name: 'apple' },
        //        { name: 'apples' },
        //        { name: 'bar' },
        //        { name: 'amazon' },
        //     ];
        //     var handlers = [
        //        { match: (v)=> v.indexOf('a') === 0 ? 'a' : false },
        //        { match: (v)=> v.indexOf('b') === 0 ? 'b' : false },
        //     ];
        //     var op = groupSequentiallyByHandlers(data, handlers);
        //     expect(op.length).to.eql(3);
        //     expect(op[0].data).to.eql([{ name: 'pple' }, { name: 'pples' }]);

        //     expect(op[1].name).to.eql(handlers[1].name);
        //     expect(op[1].data).to.eql([{ name: 'ar' }]);

        //     expect(op[2].name).to.eql(handlers[0].name);
        //     expect(op[2].data).to.eql([{ name: 'mazon' }]);

        // });
    });
});
