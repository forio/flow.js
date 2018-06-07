import * as utils from '../handler-utils';
import { expect } from 'chai';

describe('Channel Utils', ()=> {
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
            expect(best.matched).to.eql('foo');
        });
        it('should return undefined if no matches found', ()=> {
            var handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
                { match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
            ];
            
            var best = findBestHandler('x', handlers);
            expect(best).to.eql(undefined);
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
            expect(op[0].data).to.eql(['apple', 'apples', 'amazon']);
            expect(op[1].data).to.eql(['banana']);
        });
        it('should skip handlers with no matches ', ()=> {
            var handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
                { match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
            ];
            var data = ['cat', 'ball'];
            var op = groupByHandlers(data, handlers);
            expect(op.length).to.eql(1);
            expect(op[0].data).to.eql(['ball']);
        });
        it('should only match one handler at a time', ()=> {
            var handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
                { match: (v)=> v.indexOf('aa') === 0 ? 'bar' : false },
            ];
            var data = ['aaa'];
            var op = groupByHandlers(data, handlers);
            expect(op.length).to.eql(1);
            expect(op[0].matched).to.eql('foo');
        });
        it('should return empty if not matches found', ()=> {
            var handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
                { match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
            ];
            var data = ['cat', 'trex'];
            var op = groupByHandlers(data, handlers);
            expect(op).to.eql([]);
        });
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
        it('should treat handlers with different returned matches as different handlers', ()=> {
            var handlers = [
                { match: (v)=> v },
            ];
            var data = ['apple', 'banana'];
            var op = groupByHandlers(data, handlers);
            expect(op.length).to.eql(2);

            expect(op[0].matched).to.eql(data[0]);
            expect(op[1].matched).to.eql(data[1]);
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

        it('should skip handlers with no matches ', ()=> {
            var handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
                { match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
            ];
            var data = [{ name: 'cat' }, { name: 'ball' }];
            var op = groupSequentiallyByHandlers(data, handlers);
            expect(op.length).to.eql(2);
            expect(op[0].data).to.eql([{ name: 'cat' }]);
            expect(op[1].data).to.eql([{ name: 'ball' }]);
        });
        it('should echo back if no matches found', ()=> {
            var handlers = [
                { match: (v)=> v.indexOf('a') === 0 ? 'foo' : false },
                { match: (v)=> v.indexOf('b') === 0 ? 'bar' : false },
            ];
            var data = [{ name: 'cat' }, { name: 'trex' }];
            var op = groupSequentiallyByHandlers(data, handlers);
            expect(op).to.eql([{ data: [{ name: 'cat' }], matched: false }, { data: [{ name: 'trex' }], matched: false }]);
        });
    });
    describe('normalizeSubscribeResponse', ()=> {
        const { normalizeSubscribeResponse } = utils;
        it('should convert undefined to empty array', ()=> {
            const topics = ['topic1'];
            const op = normalizeSubscribeResponse(undefined, topics);
            expect(op).to.eql([]);
        });
        it('should convert literals to name value', ()=> {
            const ip = 'foo';
            const topics = ['topic1'];
            const op = normalizeSubscribeResponse(ip, topics);
            expect(op).to.eql([{ name: 'topic1', value: 'foo' }]);
        });
        it('should convert arrays to name value if no name property and single topic', ()=> {
            const ip = ['foo'];
            const topics = ['topic1'];
            const op = normalizeSubscribeResponse(ip, topics);
            expect(op).to.eql([{ name: 'topic1', value: ['foo'] }]);
        });
        it('should leave named arrays as-is if topic matches', ()=> {
            const ip = [{ name: 'topic1', value: 'foo' }];
            const topics = ['topic1'];
            const op = normalizeSubscribeResponse(ip, topics);
            expect(op).to.eql(ip);
        });
        it('should convert objects to arrays', ()=> {
            const ip = { topic2: 'bar', topic1: 'test' };
            const topics = ['topic1', 'topic2'];
            const op = normalizeSubscribeResponse(ip, topics);
            expect(op).to.eql([{ name: 'topic1', value: 'test' }, { name: 'topic2', value: 'bar' }]);
        });
        it('should ignore additional properties on objects ', ()=> {
            const ip = { foo: 'bar', topic1: 'test' };
            const topics = ['topic1'];
            const op = normalizeSubscribeResponse(ip, topics);
            expect(op).to.eql([{ name: 'topic1', value: 'test' }]);
        });
    });
});
