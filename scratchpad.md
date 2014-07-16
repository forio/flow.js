- Need to identify where the value is coming from
    Model (Run)
    Model (Operation)
    Data API
        Ignore because you can store everything in the run object

- Can pipe values to filters

    F.flow.formatters.upperCase = function () {}


* Flow.dom.nodes.register('contour-chart', {
*     propertyHandlers : [
*         {test: 'bind', handle: function (data){
*             var time = data.time;
*         } }
*     ],
*
*     init: function() {
*         $(this).on(f.model.update, function () {
*
*         });
*     };
* })

* Flow.dom.attributes.register('bind', 'contour-chart', function (data){
*             var time = data.time;
*         });


Flow.dom.attributes.register('toggle', '*', function(prop, value) {
    this.css(display, 'none');
})


Flow.dom.attributes.register('disabled', handleDisabled);
Flow.dom.attributes.register('disabled', 'input:text', handleDisabled);

Flow.handlers.addAttributeHandler('on-load', initializer, handleDisabled);

var g = GeneratorFactory.get(elem);
var modelVar = g.getModelVariables();
channel.bind(modelVar, elem);


channel.addSource(collection)
collection.on('add', function(mdl){
    var variables = mdl.getBindings();
    channel.bind(variables, model);
});


var b = Backbone.View.extend({
    events: {
        'change #textbox'
    },

    initialize: fuction () {
        channel.bind('price', this.handlePriceChange);
    },

    render: function(){
        var rendered = this.tmpl();
        Flow.bind(rendered);
    }
});

Generator:
    - Attaches itself to DOM elements with the right attributes
    - On change figures out the right model variable name and value
    - Passes on model variable name and value
        ? trigger an update event on itself?
        ? call attached channel instance with this?
        ? Save to run api directly?

    ^
    |
Channel


    Triggers model.change with old value, new value

    |
    v

Updater:
    - Catches model.change events on DOM elements. Model.change will be triggered with variable name, value
    - Update yourself with the right value

