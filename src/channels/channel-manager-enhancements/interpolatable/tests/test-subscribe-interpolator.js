import { default as subscribeInterpolator, 
    getVariablesToInterpolate,
    interpolateTopicsWithVariables,
    mergeInterpolatedTopicsWithData,
} from '../subscribe-interpolator';

describe('Subscribe Interceptor', ()=> {
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
        it('should dedupe deps', ()=> {
            var input = ['foo<bar><bar>', 'bar<vlag>', 'test[<bar>]'];
            var op = getVariablesToInterpolate(input);
            expect(op).to.eql(['bar', 'vlag']);
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

    describe('subscribeInterpolator', ()=> {
        var mockSubscribe, wrapped, subsCounter;
        beforeEach(()=> {
            subsCounter = 0;
            mockSubscribe = sinon.spy((topics, cb, options)=> {
                var toReturn = topics.reduce((accum, topic, index)=> {
                    accum[topic] = topic + '1';
                    return accum;
                }, {});
                subsCounter++;
                var subsid = 'subsid' + subsCounter;
                cb(toReturn, { id: subsid });
                return subsid;
            });
            wrapped = subscribeInterpolator(mockSubscribe);

        });
        it('should pass through options if not interpolated', ()=> {
            var cb = sinon.spy();

            var newsubsid = wrapped(['a', 'b', 'c'], cb);
            expect(mockSubscribe).to.have.been.calledOnce;
            expect(mockSubscribe).to.have.been.calledWith(['a', 'b', 'c'], cb);
            expect(newsubsid).to.eql('subsid1');
        });

        it('should call subscribe once with originals and once with interpolated', ()=> {
            var originalInput = ['price', 'sales', 'revenue[<step>]'];
            var finalCb = sinon.spy();

            wrapped(originalInput, finalCb);
            expect(finalCb).to.have.been.calledOnce;
            expect(finalCb).to.have.been.calledWith({
                price: 'price1',
                sales: 'sales1',
                'revenue[<step>]': 'revenue[step1]1',
            });
        });

        describe('interceptionCallback', ()=> {
            it('should not callback if there are no interpolated subscriptions', ()=> {
                var interceptionCallback = sinon.spy();
                var wrapped = subscribeInterpolator(mockSubscribe, interceptionCallback);
                wrapped(['a', 'b', 'c'], ()=>{});
                expect(interceptionCallback).to.not.have.been.called;
            });
            it('should callback with two subsids if interpolated', ()=> {
                var interceptionCallback = sinon.spy();
                var wrapped = subscribeInterpolator(mockSubscribe, interceptionCallback);
                wrapped(['a', 'b[<step>]', 'c'], ()=>{});

                expect(interceptionCallback).to.have.been.calledOnce;
                expect(interceptionCallback).to.have.been.calledWith('subsid1', 'subsid2');
            });
        });
    });
    
});
