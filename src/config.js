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

        repeat: {
            template: 'f-repeat-template',
            templateId: 'f-repeat-template-id'
        }
    }
};
