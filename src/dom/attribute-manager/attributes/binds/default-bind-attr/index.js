import { template } from 'lodash';
import { addContentAndAnimate } from 'utils/animation';
import { animation } from 'config';

import { extractVariableName, extractAlias, translateDataToTemplatable, translateDataToInsertable } from '../bind-utils';

import { getKnownDataForEl, updateKnownDataForEl, removeKnownData, findMissingReferences, stubMissingReferences, addBackMissingReferences, isTemplated, getOriginalContents, clearOriginalContents } from 'dom/attribute-manager/attr-template-utils';

const elAnimatedMap = new WeakMap(); //TODO: Can probably get rid of this if we make subscribe a promise and distinguish between initial value

function toAliasMap(topics) {
    return (topics || []).reduce((accum, topic)=> {
        accum[topic.name] = topic.alias;   
        return accum;
    }, {});
}

function getNewContent(currentContents, value, $el, topics) {
    if (!isTemplated(currentContents)) {
        return translateDataToInsertable(value);
    }

    const templateData = translateDataToTemplatable(value, toAliasMap(topics));
    const knownData = getKnownDataForEl($el);
    $.extend(templateData, knownData);

    const missingReferences = findMissingReferences(currentContents, Object.keys(templateData));
    const stubbedTemplate = stubMissingReferences(currentContents, missingReferences);

    const templateFn = template(stubbedTemplate);
    try {
        const templatedHTML = templateFn(templateData);
        const templatedWithReferences = addBackMissingReferences(templatedHTML, missingReferences);
        return templatedWithReferences;
    } catch (e) { //you don't have all the references you need;
        updateKnownDataForEl($el, templateData);
        return currentContents;
    }
}

/**
 * @type AttributeHandler 
 */
const bindAttrHandler = {

    target: '*',

    test: 'bind',

    parse: function (topics) {
        return topics.map((topic)=> {
            const attrVal = topic.name;
            return {
                name: extractVariableName(attrVal),
                alias: extractAlias(attrVal),
            };
        });
    },

    //FIXME: Can't do this because if you have a bind within a foreach, foreach overwrites the old el with a new el, and at that points contents are lost
    // But if i don't do this the <%= %> is going to show up
    // init: function (attr, value, $el) {
    //     const contents = getOriginalContents($el, ($el)=> $el.html());
    //     if (isTemplated(contents)) {
    //         $el.empty();
    //     }
    // },

    unbind: function (attr, $el) {
        const el = $el.get(0);
        elAnimatedMap.delete(el);

        const bindTemplate = getOriginalContents($el);
        const current = $el.html();
        if (bindTemplate && current !== bindTemplate) {
            $el.html(bindTemplate);
        }
        clearOriginalContents($el);
        removeKnownData($el);
    },

    handle: function (value, prop, $el, topics) {
        const el = $el.get(0);
        const originalContents = getOriginalContents($el, ($el)=> $el.html());
        const contents = getNewContent(originalContents, value, $el, topics);

        addContentAndAnimate($el, contents, !elAnimatedMap.has(el), animation);
        elAnimatedMap.set(el, true);
    }
};

export default bindAttrHandler;
