const convert = require('src/channels/channel-utils').normalizePublishInputs;

describe.only('Channel Utils', ()=> {
    describe('#normalizePublishInputs', ()=> {
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
});
