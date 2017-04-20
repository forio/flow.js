'use strict';
var webpack = require('webpack');
var path = require('path');

var uglifyOptions = {
    mangle: false,
    warnings: true,
    sourceMap: true,
    compress: {
        screw_ie8: true,
        join_vars: false
    }
};

module.exports = function (grunt) {
    var version = grunt.file.readJSON('package.json').version;
    var banner = grunt.file.read('banner.txt');
    banner = banner.replace('RELEASE_VERSION', version);

    grunt.config.set('webpack', {
        options: {
            plugins: [
                new webpack.DefinePlugin({
                    RELEASE_VERSION: JSON.stringify(version)
                })
            ],
            resolve: {
                modules: [__dirname + '/../src', 'node_modules']
            }
        },
        edge: {
            entry: path.resolve('./src/flow.js'),
            output: {
                path: path.resolve('./dist/'),
                pathinfo: true,
                filename: 'flow-edge.js',
                library: 'Flow',
                libraryTarget: 'var'
            },
            // watch: true,
            // keepalive: true,
            stats: {
                // Configure the console output
                colors: true,
                modules: false,
                reasons: false
            },
            plugins: [
                new webpack.HotModuleReplacementPlugin()
            ],
            devtool: 'eval'
        },
        tests: {
            entry: path.resolve('./tests/test-list.js'),
            output: {
                path: path.resolve('./tests/dist/'),
                filename: 'tests-bundle.js'
            },
            module: {
                rules: [
                    { 
                        test: /\.js$/, 
                        include: path.resolve('./tests'),
                        loader: 'babel-loader',
                        options: {
                            plugins: [
                                'babel-plugin-transform-es2015-arrow-functions',
                                'babel-plugin-transform-es2015-template-literals'
                            ]
                        }
                    },
                    { 
                        test: /\.js$/, 
                        exclude: [
                            /node_modules/,
                            path.resolve('./tests'),
                        ],
                        loader: 'babel-loader',
                        options: {
                            plugins: ['istanbul']
                        }
                    },
                    { test: /\.html$/, loader: 'raw-loader' },
                    { test: /\.py$/, loader: 'raw-loader' },
                    { test: /\.jl$/, loader: 'raw-loader' },
                ]
            },
            devtool: 'eval-source-map',
            resolve: {
                alias: {
                    src: __dirname + '/../src'
                }
            }
        },

        mapped: {
            entry: path.resolve('./src/flow.js'),
            output: {
                path: path.resolve('./dist/'),
                filename: 'flow.js',
                library: 'Flow',
                libraryTarget: 'var'
            },
            devtool: 'source-map',
        },
        min: {
            entry: path.resolve('./src/flow.js'),
            output: {
                path: path.resolve('./dist/'),
                filename: 'flow.min.js',
                library: 'Flow',
                libraryTarget: 'var'
            },
            plugins: [
                new webpack.DefinePlugin({
                    RELEASE_VERSION: JSON.stringify(version)
                }),
                new webpack.BannerPlugin({
                    banner: banner,
                    entryOnly: true
                }),
                new webpack.optimize.UglifyJsPlugin(uglifyOptions),
            ],
            devtool: 'source-map'
        },
        addons: {
            entry: path.resolve('./src/add-ons/flow-inspector/flow-inspector.js'),
            devtool: 'source-map',
            output: {
                path: path.resolve('./dist/add-ons/'),
                filename: 'flow-inspector.min.js'
            },
            plugins: [
                new webpack.optimize.UglifyJsPlugin(uglifyOptions)
            ],
            module: {
                rules: [
                    { test: /\.html$/, loader: 'raw-loader' },
                ]
            }
        }
    });
};
