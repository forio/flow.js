module.exports = {
    prefix: 'f',
    binderAttr: 'f-bind',

    events: {
        //UI Change to publish to the channel.
        trigger: 'update.f.ui',

        //Trigger with payload '{attrToUpdate: value}', for e.g. { bind: 34 }. This will run this through all the converts and pass it to attr handler. Useful to by-pass getting this from the model directly.
        convert: 'f.convert',

        //On a bind or other flow-related error
        error: 'f.error',
    },

    attrs: {
        checkboxOffValue: 'data-off-value',
        //Used by repeat attr handler to keep track of template after first evaluation
        repeat: {
            templateId: 'repeat-template-id' //don't prefix by f or dom-manager unbind will kill it
        },
    },

    errorAttr: 'data-flow-error',
    animation: {
        addAttr: 'data-add',
        changeAttr: 'data-update',
        initialAttr: 'data-initial',
    }
};
