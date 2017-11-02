'use strict';
module.exports = {
    prefix: 'f',
    defaultAttr: 'bind',

    binderAttr: 'f-bind',

    events: {
        //UI Change to publish to the channel.
        trigger: 'update.f.ui',

        //Payload is of form {topic: value}. When triggered on a element dom-manager will trigger 'f.convert' on every attribute subscribed to that topic
        channelDataReceived: 'update.f.model',

        //Trigger with payload '{attrToUpdate: value}', for e.g. { bind: 34 }. This will run this through all the converts and pass it to attr handler. Useful to by-pass getting this from the model directly.
        convert: 'f.convert',

        //When triggered posts the payload to the operations API. Assumes payloaded is formmatted in a way Run Channel can understand
        operate: 'f.ui.operate'
    },

    attrs: {
        //Array with shape [{ attr: attribute, topics:[list of topics attribute is listening to]}]
        bindingsList: 'f-attr-bindings',

        //Subscription id returned by the channel. Used to ubsubscribe later
        subscriptionId: 'subscription-id',

        //Used by the classes attr handler to keep track of which classes were added by itself
        classesAdded: 'f-added-classes',

        //Used by repeat attr handler to keep track of template after first evaluation
        repeat: {
            template: 'repeat-template', //don't prefix by f or dom-manager unbind will kill it
            templateId: 'repeat-template-id'
        },

        //Used by foreach attr handler to keep track of template after first evaluation
        foreachTemplate: 'f-foreach-template',
        keyAs: 'f-foreach-key-as',
        valueAs: 'f-foreach-value-as',
    }
};
