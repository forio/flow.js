'use strict';
var path = require('path');

module.exports = function (grunt) {
    var babelloader = { 
        test: /\.js$/, 
        exclude: /node_modules\/(?!(autotrack|dom-utils))/,
        loader: 'babel-loader',
        options: {
            plugins: [
                // 'transform-es2015-modules-commonjs',
                'transform-es2015-destructuring',
                'transform-es2015-block-scoping',
                'babel-plugin-transform-es2015-arrow-functions',
                'babel-plugin-transform-es2015-classes',
                'babel-plugin-transform-es2015-template-literals',
            ]
        }
    };
    grunt.config.set('karma', {
        options: {
            basePath: '',
            browsers: ['Chrome'],
            frameworks: ['mocha', 'sinon-chai'],
            hostname: 'local.forio.com',
            files: [
                { pattern: 'node_modules/jquery/dist/jquery.js', watched: false, included: true, served: true },
                { pattern: 'node_modules/lodash/lodash.js', watched: false, included: true, served: true },
                { pattern: 'node_modules/epicenter-js/dist/epicenter.min.js', watched: false, included: true, served: true },
                // { pattern: 'tests/dist/tests-bundle.js', watched: true, included: true, served: true },
                { pattern: 'tests/test-list.js', watched: true, included: true, served: true },
                // { pattern: 'tests/specs/dom/test-dom-manager.js', watched: false, included: true, served: true },
                // { pattern: 'tests/specs/sample.js', watched: false, included: true, served: true },
            ],
            reporters: ['progress'],
            singleRun: false,
            browserConsoleLogOptions: {
                terminal: false
            },
            // logLevel: 'debug',
            client: {
                chai: {
                    // includeStack: true
                }
            },
            preprocessors: {
                // 'tests/specs/**/*.js': ['webpack'],
                'tests/test-list.js': ['webpack'],
            },
            webpack: {
                stats: {
                    assets: false,
                    modules: false,
                    entrypoints: false,
                    chunks: false,
                    children: false,
                },
                module: {
                    rules: [
                        Object.assign({}, babelloader, {
                            include: path.resolve('./tests'),
                        }),
                        { test: /\.html$/, loader: 'raw-loader' },
                        { test: /\.py$/, loader: 'raw-loader' },
                        { test: /\.jl$/, loader: 'raw-loader' },
                    ]
                },
                devtool: 'eval',
                resolve: {
                    modules: [__dirname + '/../src', 'node_modules'],
                    alias: {
                        src: __dirname + '/../src'
                    }
                }
            }
        },
        tests: {

        }
    });

};
