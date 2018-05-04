import { default as publishInterpolator, 
    getDependencies,
    interpolateWithDependencies,
} from '../publish-interpolator';

import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));

const { expect } = chai;

function formatInputs(inputs) {
    return inputs.map((ip, index)=> {
        return {
            name: ip,
            value: index + 1
        };
    });
}
describe('Publish Interceptor', ()=> {
    describe('#getDependencies', ()=> {
        it('should return empty array if no matches', ()=> {
            var input = formatInputs(['foo', 'bar']);
            var op = getDependencies(input);
            expect(op).to.eql([]);
        });
        it('handle singly interpolated variables', ()=> {
            var input = formatInputs(['foo<bar>', 'bar', 'test[<blah>]']);
            var op = getDependencies(input);
            expect(op).to.eql(['bar', 'blah']);
        });
        it('should handle multiple interpolations on single variable', ()=> {
            var input = formatInputs(['foo<bar><cat>', 'bar', 'test[<blah>]']);
            var op = getDependencies(input);
            expect(op).to.eql(['bar', 'cat', 'blah']);
        });
        it('should dedupe deps', ()=> {
            var input = formatInputs(['foo<bar><bar>', 'bar<vlag>', 'test[<bar>]']);
            var op = getDependencies(input);
            expect(op).to.eql(['bar', 'vlag']);
        });
    });
    describe('#interpolateWithDependencies', ()=> {
        it('should not interpolate if no matches found', ()=> {
            var input = formatInputs(['foo', 'bar']);
            var op = interpolateWithDependencies(input, { foo: 1, bar: 4 });
            expect(op).to.eql(input);
        });
        it('should interpolate single variable matches', ()=> {
            var input = formatInputs(['foo<a>', 'bar[<b>]', 'car<a>']);
            var op = interpolateWithDependencies(input, { a: 2, b: 4, c: 6 });
            var expectedOp = formatInputs(['foo2', 'bar[4]', 'car2']);
            expect(op).to.eql(expectedOp);
        });
        it('should interpolate multiple variable matches', ()=> {
            var input = formatInputs(['foo[<a>,<b>]', 'bar[<b>]', 'bar', 'car<a><c>']);
            var op = interpolateWithDependencies(input, { a: 2, b: 4, c: 6 });
            expect(op).to.eql(formatInputs(['foo[2,4]', 'bar[4]', 'bar', 'car26']));
        });
        it('should use last item if interpolated with array', ()=> {
            var input = formatInputs(['foo<a>', 'bar[<b>]', 'bar', 'car<a>']);
            var op = interpolateWithDependencies(input, { a: [2, 3, 4], c: 4, b: [6, 9] });
            expect(op).to.eql(formatInputs(['foo4', 'bar[9]', 'bar', 'car4']));
        });
    });
    describe('publishInterpolator', ()=> {
        var mockPublish, mockFetch, wrapped;
        beforeEach(()=> {
            mockFetch = sinon.spy((topics, cb)=> {
                var toReturn = topics.reduce((accum, topic, index)=> {
                    accum[topic] = topic + '1';
                    return accum;
                }, {});
                cb(toReturn);
            });
            mockPublish = sinon.spy((ip)=> $.Deferred().resolve(ip).promise());
            wrapped = publishInterpolator(mockPublish, mockFetch);
        });

        it('should pass through if not interpolated', ()=> {
            var ips = formatInputs(['a', 'b']);
            return wrapped(ips).then(()=> {
                mockFetch.should.not.have.been.called;
                mockPublish.should.have.been.calledOnce;
                mockPublish.should.have.been.calledWith(ips);
            });
        });
        it('should fetch if interpolated', ()=> {
            var input = formatInputs(['foo<a>', 'bar[<b>]', 'bar', 'car<a>']);
            return wrapped(input).then(()=> {
                mockFetch.should.have.been.calledWith(['a', 'b']);
                mockPublish.should.have.been.calledWith([
                    { name: 'fooa1', value: 1 },
                    { name: 'bar[b1]', value: 2 },
                    { name: 'bar', value: 3 },
                    { name: 'cara1', value: 4 },
                ]);
            });
        });
        it('should resolve promises in the right order', ()=> {
            var input = formatInputs(['foo<a>', 'bar[<b>]', 'bar', 'car<a>']);
            var finalCb = sinon.spy();
            return wrapped(input).then(finalCb).then(()=> {
                expect(mockFetch).to.have.been.calledBefore(mockPublish);
                expect(mockPublish).to.have.been.calledBefore(finalCb);
                expect(finalCb).to.have.been.calledWith([
                    { name: 'fooa1', value: 1 },
                    { name: 'bar[b1]', value: 2 },
                    { name: 'bar', value: 3 },
                    { name: 'cara1', value: 4 },
                ]);
            });
        });
    });
    
});
