module.exports = function() {
    'use strict';

    var generators = [];
    var channel;

    //Jquery selector to return everything which has a f- property set
    $.expr[':'].f = function(obj){
        var $this = $(obj);
        return (!!$this.data('f-value'));
    };

    var publicAPI = {

        initialize: function() {

            //parse through dom and find everything with f- attribute
            var matchedElements = [];

            $.each(matchedElements, function(index, element) {
                $.each(generators, function(index, generator) {
                    if (generator.test(element) === true) {

                        generator.claim(element);
                        channel.bind(generator.getModelName(element), element);
                    }
                });
            });
        }
    };

    $.extend(this, publicAPI);
};
