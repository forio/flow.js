$.expr.pseudos.webcomponent = function (obj) {
    return obj.nodeName.indexOf('-') !== -1;
};
/**
 * @type AttributeHandler 
 */
const webcompHandler = {
    target: ':webcomponent',

    test: 'bind',

    handle: ()=> {}
};

export default webcompHandler;
