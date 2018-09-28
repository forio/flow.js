/**
 * @type AttributeHandler 
 */
const defaultAttr = {
    test: '*',

    target: '*',

    handle: function (value, prop, $el) {
        //FIXME: The _right_ way to do this would be to set attr, not prop. 
        //However Polymer 1.0 doesn't link attrs with stringified JSON, and that's really the primary use-case for this, so, ignoring
        //However Polymer is fine with 'data-X' attrs having stringified JSON. Eventually we should make this attr and fix polymer
        //but can't do that for backwards comptability reason. See commit bbc4a49039fb73faf1ef591a07b371d7d667cf57
        $el.prop(prop, value);
    }
};

export default defaultAttr;
