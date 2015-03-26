'use strict';

var walk = require('fs-walk');
var istanbul = require('istanbul');
var fs = require('fs');

module.exports = function (grunt) {
    grunt.registerTask('instrument',
        'using isntanbul to instrument sourcefile',
            function () {
                var instrumenter = new istanbul.Instrumenter();
                var instrumentFile = function (dir, fileName, stat) {
                    var newDir = dir.replace(/src/, 'instrument');
                    if (!fs.existsSync(newDir)) {
                        fs.mkdirSync(newDir);
                    }
                    if (stat.isDirectory() && !fs.existsSync(newDir + fileName)){
                        fs.mkdirSync(newDir + fileName);
                    }
                    if (stat.isFile()){
                        var file = fs.readFileSync(dir + '/' + fileName, 'utf8');
                        instrumenter.instrument(file, dir + '/' + fileName,
                            function (err, code) {
                                fs.writeFileSync(newDir + '/' + fileName, code);
                            });
                    }
                };
                walk.walkSync(__dirname + '/../src/',
                    function (basedir, filename, stat) {
                        instrumentFile(basedir, filename, stat);
                });
    });


};
