const utils = require('src/channels/channel-utils');

describe.only('Channel Utils', ()=> {
    describe('#normalizePublishInputs', ()=> {
        var convert = utils.normalizePublishInputs;

        it('should convert arrays', ()=> {
            var input = [{ name: 'foo', value: 'bar' }];
            var options = { foo: 'bah' };
            var output = convert(input, options);
            var expectedOutput = { toPublish: input, options: options };

            expect(output).to.eql(expectedOutput);
        });
        it('should convert objects', ()=> {
            var input = { a: 1, b: 'good' };
            var options = { foo: 'bah' };
            var output = convert(input, options);
            var expectedOutput = { 
                toPublish: [{ name: 'a', value: 1 }, { name: 'b', value: 'good' }], 
                options: options 
            };

            expect(output).to.eql(expectedOutput);
        });
        it('should convert key, value pairs', ()=> {
            var options = { foo: 'bah' };
            var output = convert('a', 1, options);
            var expectedOutput = { 
                toPublish: [{ name: 'a', value: 1 }], 
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
    describe('#groupDataByHandlers', ()=> {
        var groupDataByHandlers = utils.groupDataByHandlers;
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
            var op = groupDataByHandlers(data, handlers);
            expect(op.length).to.eql(3);
            expect(op[0].name).to.eql(handlers[0].name);
            expect(op[1].name).to.eql(handlers[1].name);
            expect(op[2].name).to.eql(handlers[0].name);
        });
    });
});
