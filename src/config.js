'use strict';
module.exports = {
    prefix: 'f',
    defaultAttr: 'bind',

    binderAttr: 'f-bind',

    events: {
        //UI Change to publish to the channel.
        trigger: 'update.f.ui',

        //Trigger with payload '{attrToUpdate: value}', for e.g. { bind: 34 }. This will run this through all the converts and pass it to attr handler. Useful to by-pass getting this from the model directly.
        convert: 'f.convert',

        //When triggered posts the payload to the operations API. Assumes payloaded is formmatted in a way Run Channel can understand
        operate: 'f.ui.operate'
    },

    attrs: {
        //Used by the classes attr handler to keep track of which classes were added by itself
        classesAdded: 'f-added-classes',

        //Used by repeat attr handler to keep track of template after first evaluation
        repeat: {
            templateId: 'repeat-template-id' //don't prefix by f or dom-manager unbind will kill it
        },

        keyAs: 'f-foreach-key-as',
        valueAs: 'f-foreach-value-as',
    },
    animation: {
        addAttr: 'data-add',
        changeAttr: 'data-update',
        initialAttr: 'data-initial',
    }
};
