'use strict';
module.exports = {
    prefix: 'f',
    defaultAttr: 'bind',

    binderAttr: 'f-bind',

    events: {
        trigger: 'update.f.ui',
        react: 'update.f.model'
    },

    attrs: {
        //Array with shape [{ attr: attribute, topics:[list of topics attribute is listening to]}]
        bindingsList: 'f-attr-bindings',

        //Subscription id returned by the channel. Used to ubsubscribe later
        subscriptionId: 'f-subscription-id',

        //Used by the classes attr handler to keep track of which classes were added by itself
        classesAdded: 'f-added-classes',

        //Used by repeat attr handler to keep track of template after first evaluation
        repeat: {
            template: 'f-repeat-template',
            templateId: 'f-repeat-template-id'
        },

        //Used by foreach attr handler to keep track of template after first evaluation
        foreachTemplate: 'f-foreach-template',

        //Used by bind attr handler to keep track of template after first evaluation
        bindTemplate: 'f-bind-template'
    }
};
