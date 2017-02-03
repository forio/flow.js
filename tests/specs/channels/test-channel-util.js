const utils = require('src/channels/channel-utils');

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
                { name: 'b', match: (v)=> v.indexOf('b') === 0 ? 'b' : false },
            ];
            
            var best = findBestHandler('a', handlers);
            expect(best.name).to.eql('a');
        });
        it('should return the right prefix', ()=> {
            var handlers = [
                { name: 'a', match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
                { name: 'b', match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
            ];
            
            var best = findBestHandler('a', handlers);
            expect(best.match).to.eql('foo');
        });
    });
    describe('#groupByHandlers', ()=> {
        var groupByHandlers = utils.groupByHandlers;
        it('should group arrays', ()=> {
            var handlers = [
               { name: 'a', handle: ()=>{}, match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
               { name: 'b', handle: ()=>{}, match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
               { name: 'c', handle: ()=>{}, match: (v)=> v.indexOf('c') === 0 ? 'cat' : false },
            ];
            var data = ['apple', 'apples', 'banana', 'amazon'];
            var op = groupByHandlers(data, handlers);
            expect(op.length).to.eql(2);
            expect(op[0].name).to.eql(handlers[0].name);
            expect(op[0].topics).to.eql(['apple', 'apples', 'amazon']);

            expect(op[1].name).to.eql(handlers[1].name);
            expect(op[1].topics).to.eql(['banana']);
        });
        it('should strip out prefixes', ()=> {
            var handlers = [
               { name: 'a', handle: ()=>{}, match: (v)=> v.indexOf('a') === 0 ? 'a' : false },
               { name: 'b', handle: ()=>{}, match: (v)=> v.indexOf('b') === 0 ? 'b' : false },
               { name: 'c', handle: ()=>{}, match: (v)=> v.indexOf('c') === 0 ? 'c' : false },
            ];
            var data = ['apple', 'apples', 'bar', 'amazon'];
            var op = groupByHandlers(data, handlers);
            expect(op[0].name).to.eql(handlers[0].name);
            expect(op[0].topics).to.eql(['pple', 'pples', 'mazon']);
            expect(op[1].topics).to.eql(['ar']);
        });
    });
    describe('#groupSequentiallyByHandlers', ()=> {
        var groupSequentiallyByHandlers = utils.groupSequentiallyByHandlers;
        it('should group arrays', ()=> {
            var data = [
               { name: 'apple', value: 1 },
               { name: 'apples', value: 2 },
               { name: 'bar', value: 3 },
               { name: 'amazon', value: 4 },
            ];
            var handlers = [
               { name: 'a', handle: ()=>{}, match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
               { name: 'b', handle: ()=>{}, match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
            ];
            var op = groupSequentiallyByHandlers(data, handlers);
            expect(op.length).to.eql(3);
            expect(op[0].name).to.eql(handlers[0].name);
            expect(op[1].name).to.eql(handlers[1].name);
            expect(op[2].name).to.eql(handlers[0].name);
        });
        it('should strip prefixes', ()=> {
            var data = [
               { name: 'apple', value: 1 },
               { name: 'apples', value: 2 },
               { name: 'bar', value: 3 },
               { name: 'amazon', value: 4 },
            ];
            var handlers = [
               { name: 'a', handle: ()=>{}, match: (v)=> v.indexOf('a') === 0 ? 'a' : false },
               { name: 'b', handle: ()=>{}, match: (v)=> v.indexOf('b') === 0 ? 'b' : false },
            ];
            var op = groupSequentiallyByHandlers(data, handlers);
            expect(op.length).to.eql(3);
            expect(op[0].data).to.eql([{ name: 'pple', value: 1 }, { name: 'pples', value: 2 }]);

            expect(op[1].name).to.eql(handlers[1].name);
            expect(op[1].data).to.eql([{ name: 'ar', value: 3 }]);

            expect(op[2].name).to.eql(handlers[0].name);
            expect(op[2].data).to.eql([{ name: 'mazon', value: 4 }]);

        });
    });
});
