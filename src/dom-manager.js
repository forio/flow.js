module.exports = (function() {
    'use strict';
    var config = require('./config');

    var nodeManager = require('./dom/node-manager.js');
    var channel = require('./flow-channel');

    // var FC = require('../channels/channel-manager.js');
    // var channel = new FC({account: 'nranjit', project: 'sales_forecaster'});

    //Jquery selector to return everything which has a f- property set
    $.expr[':'][config.prefix] = function(obj){
        var $this = $(obj);
        var dataprops = _.keys($this.data());

        var match = _.find(dataprops, function (attr) {
            return (attr.indexOf(config.prefix) === 0);
        });

        return !!(match);
    };


    var publicAPI = {

        channel: channel,

        initialize: function(root) {
            $(function(){
                if (!root) {
                    root = '*';
                }
                //parse through dom and find everything with matching attributes
                var matchedElements = $(root).find(':' + config.prefix);

                $.each(matchedElements, function(index, element) {
                    console.log(nodeManager);
                    $.each(nodeManager, function(name, generator) {
                        if ($(element).is(generator.selector)) {
                            var view = new generator.handler({
                                el: element,
                                channel: channel
                            });
                            console.log(view, generator.selector);
                            return false; //break loop
                        }
                    });
                });
            });
        }
    };

    return publicAPI;

    // $.extend(this, publicAPI);
}());
