(function() {
    'use strict';

    describe('Flow monitor', function () {
        var core;

        before(function () {
            core = Flow.channel.private;
        });

        after(function () {
        });

        describe('#getInnerVariables', function() {
            it('should extract single variable within limiters', function() {
                var result = core.getInnerVariables('price[<time>]');
                result.should.eql(['time']);
            });

            it('should extract multiple variable within limiters', function() {
                var result = core.getInnerVariables('price[<time>,<step>]');
                result.should.eql(['time', 'step']);
            });

            it('should return nothing if nothing to interpolate', function() {
                var result = core.getInnerVariables('price');
                result.should.eql([]);
            });
        });

        describe('#interpolate', function () {
            describe('.interpolated', function () {
                it('should interpolate single variable', function() {
                    var result = core.interpolate({'price[<time>]': 1}, {time: 1});
                    var interpolated = result.interpolated;

                    interpolated.should.eql({'price[1]': 1});
                });
                it('should interpolate multiple variables', function() {
                    var result = core.interpolate({'price[<time>,2,<step>]': 1}, {time: 1, step: 4});
                    var interpolated = result.interpolated;

                    interpolated.should.eql({'price[1,2,4]': 1});
                });
                it('should not interpolate if it finds nothing', function() {
                    var result = core.interpolate({'price[<time>,2,<step>]': 1}, {});
                    var interpolated = result.interpolated;

                    interpolated.should.eql({'price[<time>,2,<step>]': 1});
                });
                it('should not do substrings', function() {
                    var result = core.interpolate({'price[<time>,2,<times>]': 1}, {time: 1, times: 2});
                    var interpolated = result.interpolated;

                    interpolated.should.eql({'price[1,2,2]': 1});
                });
                it('should do multiples', function() {
                    var result = core.interpolate({'price[<time>,2,<times>]': 1, 'sales[<time>]': 1}, {time: 1, times: 2});
                    var interpolated = result.interpolated;

                    interpolated.should.eql({'price[1,2,2]': 1, 'sales[1]': 1});
                });
            });
            describe('.interpolationMap', function () {
                it('should interpolate single variable', function() {
                    var result = core.interpolate({'price[<time>]': 1}, {time: 1});
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({'price[1]': 'price[<time>]'});
                });
                it('should interpolate multiple variables', function() {
                    var result = core.interpolate({'price[<time>,2,<step>]': 1}, {time: 1, step: 4});
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({'price[1,2,4]': 'price[<time>,2,<step>]'});
                });
                it('should not interpolate if it finds nothing', function() {
                    var result = core.interpolate({'price[<time>,2,<step>]': 1}, {});
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({'price[<time>,2,<step>]': 'price[<time>,2,<step>]'});
                });
                it('should not do substrings', function() {
                    var result = core.interpolate({'price[<time>,2,<times>]': 1}, {time: 1, times: 2});
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({'price[1,2,2]': 'price[<time>,2,<times>]'});
                });
                it('should do multiples', function() {
                    var result = core.interpolate({'price[<time>,2,<times>]': 1, 'sales[<time>]': 1}, {time: 1, times: 2});
                    var interpolationMap = result.interpolationMap;

                    interpolationMap.should.eql({'price[1,2,2]': 'price[<time>,2,<times>]', 'sales[1]': 'sales[<time>]'});
                });

            });

        });

    });
}());
