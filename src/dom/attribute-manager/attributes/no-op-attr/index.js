/**
 * @type AttributeHandler 
 */
const noopAttr = {

    target: '*',

    test: /^(?:model|convert|channel|on-init)/i,

    handle: ()=> {},
    parse: ()=> []
};

export default noopAttr;
