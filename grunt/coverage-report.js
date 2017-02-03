'use strict';
var istanbul = require('istanbul');
var fs = require('fs');

module.exports = function (grunt) {
    grunt.registerTask('coverage-report',
        'uses istanbul to generate new report',
        function () {
            var collector = new istanbul.Collector();
            var reporter = new istanbul.Reporter(false, 'coverage');
            collector.add(JSON.parse(fs.readFileSync('coverage/coverage.json', 'utf8')));
            reporter.add('html');
            reporter.write(collector, true, function () {
                //empty callback so it doesnt error out
            });
    });
};
