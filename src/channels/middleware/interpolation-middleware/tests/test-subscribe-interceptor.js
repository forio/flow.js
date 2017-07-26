import { default as subscribeInterpolator, 
    getVariablesToInterpolate,
    interpolateTopicsWithVariables,
    mergeInterpolatedTopicsWithData,
} from '../subscribe-interceptor';

describe.only('Subscribe Interceptor', ()=> {
    describe('#getVariablesToInterpolate', ()=> {
        it('should return empty array if no matches', ()=> {
            var input = ['foo', 'bar'];
            var op = getVariablesToInterpolate(input);
            expect(op).to.eql([]);
        });
        it('handle singly interpolated variables', ()=> {
            var input = ['foo<bar>', 'bar', 'test[<blah>]'];
            var op = getVariablesToInterpolate(input);
            expect(op).to.eql(['bar', 'blah']);
        });
        it('should handle multiple interpolations on single variable', ()=> {
            var input = ['foo<bar><cat>', 'bar', 'test[<blah>]'];
            var op = getVariablesToInterpolate(input);
            expect(op).to.eql(['bar', 'cat', 'blah']);
        });
    });
    describe('#interpolateTopicsWithVariables', ()=> {
        it('should not interpolate if no matches found', ()=> {
            var input = ['foo', 'bar'];
            var op = interpolateTopicsWithVariables(input, { foo: 2, bar: 4 });
            expect(op).to.eql(input);
        });
        it('should interpolate single variable matches', ()=> {
            var input = ['foo<a>', 'bar[<b>]', 'bar', 'car<a>'];
            var op = interpolateTopicsWithVariables(input, { a: 2, b: 4, c: 6 });
            expect(op).to.eql(['foo2', 'bar[4]', 'bar', 'car2']);
        });
        it('should interpolate multiple variable matches', ()=> {
            var input = ['foo[<a>,<b>]', 'bar[<b>]', 'bar', 'car<a><c>'];
            var op = interpolateTopicsWithVariables(input, { a: 2, b: 4, c: 6 });
            expect(op).to.eql(['foo[2,4]', 'bar[4]', 'bar', 'car26']);
        });
        it('should use last item if interpolated with array', ()=> {
            var input = ['foo<a>', 'bar[<b>]', 'bar', 'car<a>'];
            var op = interpolateTopicsWithVariables(input, { a: [2, 3, 4], c: 4, b: [6, 9] });
            expect(op).to.eql(['foo4', 'bar[9]', 'bar', 'car4']);
        });
    });
    describe('#mergeInterpolatedTopicsWithData', ()=> {
        it('should merge all items if data available', ()=> {
            var original = ['foo[<a>,<b>]', 'bar[<b>]', 'bar', 'car<a><c>'];
            var interpolated = ['foo[2,4]', 'bar[4]', 'bar', 'car26'];
            var data = {
                'foo[2,4]': 'f1',
                'bar[4]': 'b2',
                bar: 44,
                car26: 12
            };
            
            var op = mergeInterpolatedTopicsWithData(original, interpolated, data);
            expect(op).to.eql({
                'foo[<a>,<b>]': 'f1',
                'bar[<b>]': 'b2',
                bar: 44,
                'car<a><c>': 12
            });
        });
        it('should not include keys if no data provided', ()=> {
            var original = ['foo[<a>,<b>]', 'bar[<b>]', 'bar', 'car<a><c>'];
            var interpolated = ['foo[2,4]', 'bar[4]', 'bar', 'car26'];
            var data = {
                'foo[2,4]': 'f1',
                car26: 12
            };
            
            var op = mergeInterpolatedTopicsWithData(original, interpolated, data);
            expect(op).to.eql({
                'foo[<a>,<b>]': 'f1',
                'car<a><c>': 12
            });
        });
    });

    it('should pass through if there are no interpolated variables', ()=> {
        
    });
});
