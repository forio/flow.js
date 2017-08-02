'use strict';
var path = require('path');

module.exports = function (grunt) {
    var babelloader = {
        test: /\.js$/,
        exclude: /node_modules\/(?!(autotrack|dom-utils))/,
        loader: 'babel-loader',
        include: path.resolve('./tests'),
    };
    var babelloaderForOlderBrowsers = Object.assign({}, babelloader, {
        options: {
            plugins: [
                ['istanbul', {
                    exclude: ['src/**/*.js']
                }],
                'transform-es2015-destructuring',
                'transform-es2015-block-scoping',
                'babel-plugin-transform-es2015-arrow-functions',
                'babel-plugin-transform-es2015-classes',
                'babel-plugin-transform-es2015-template-literals',
            ]
        }
    });

    var webpackLoaders = [
        { test: /\.html$/, loader: 'raw-loader' },
        { test: /\.py$/, loader: 'raw-loader' },
        { test: /\.jl$/, loader: 'raw-loader' }
    ];
    var fileDeps = [
        { src: 'node_modules/jquery/dist/jquery.js', watched: false, included: true, served: true },
        { src: 'node_modules/lodash/lodash.js', watched: false, included: true, served: true },
        { src: 'node_modules/epicenter-js/dist/epicenter.min.js', watched: false, included: true, served: true },
    ];
    grunt.config.set('karma', {
        options: {
            basePath: '',
            browsers: ['ChromeHeadless'],
            frameworks: ['mocha', 'sinon-chai'],
            hostname: 'local.forio.com',
            reporters: ['mocha'],
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
            mochaReporter: {
                showDiff: 'unified',
                ignoreSkipped: true,
                output: 'minimal',
            },
            webpackMiddleware: {
                stats: 'none'
            },
            webpack: {
                module: {
                    rules: [babelloader].concat(webpackLoaders)
                },
                stats: 'errors-only',
                devtool: 'eval',
                resolve: {
                    modules: [path.resolve('./src'), 'node_modules'],
                    alias: {
                        src: path.resolve('./src')
                    }
                }
            }
        },
        allTests: {
            files: fileDeps.concat([
                { src: 'tests/test-list.js', watched: false, included: true, served: true },
            ]),
            options: {
                preprocessors: {
                    'tests/test-list.js': ['webpack'],
                },
                browserConsoleLogOptions: {
                    terminal: false
                },
                // background: false,
                singleRun: true,
                exclude: [
                    'tests/specs/test-flow.js'
                ],
            }
        },
        singleTest: {
            files: fileDeps,
            options: {
                browserConsoleLogOptions: {
                    terminal: false
                },
                singleRun: true,
            }
        },
        testWithCoverage: {
            files: fileDeps.concat([
                { src: 'tests/specs/**/*.js', watched: false, included: true, served: true },
                { src: 'src/**/test-*.js', watched: false, included: true, served: true },
            ]),
            options: {
                preprocessors: {
                    '**/test-*.js': ['webpack'],
                },
                browserConsoleLogOptions: {
                    terminal: false
                },
                // background: false,
                singleRun: true,
                exclude: [
                    'tests/specs/test-flow.js'
                ],
                coverageReporter: {
                    type: 'html',
                    dir: 'coverage/'
                },
                reporters: ['progress', 'coverage'],
                webpack: {
                    module: {
                        rules: [babelloaderForOlderBrowsers].concat(webpackLoaders)
                    },
                    stats: 'errors-only',
                    devtool: 'eval',
                    resolve: {
                        modules: [path.resolve('./src'), 'node_modules'],
                        alias: {
                            src: path.resolve('./src')
                        }
                    }
                }
            }
        }
    });

};
