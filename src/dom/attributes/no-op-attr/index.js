/**
 * ## No-op Attributes
 *
 * Flow.js provides special handling for both `data-f-model` (described [here](../../../../#using_in_project)) and `data-f-convert` (described [here](../../../../converter-overview/)). For these attributes, the default behavior is to do nothing, so that this additional special handling can take precendence.
 *
 */

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
