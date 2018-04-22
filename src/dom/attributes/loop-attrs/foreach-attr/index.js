import { toImplicitType } from 'utils/parse-utils';
import { animation } from '../../../../config';

import { aliasesFromTopics, parseTopics } from '../loop-attr-utils';
import { addChangeClassesToList } from 'utils/animation';
import { each, template } from 'lodash';

import { getKnownDataForEl, updateKnownDataForEl, removeKnownData, findMissingReferences, stubMissingReferences, addBackMissingReferences, getOriginalContents, clearOriginalContents } from '../../attr-template-utils';

const elAnimatedMap = new WeakMap(); //TODO: Can probably get rid of this if we make subscribe a promise and distinguish between initial value

/**
 * @type AttributeHandler
 */
const foreachAttr = {

    test: 'foreach',

    target: '*',

    unbind: function (attr, $el) {
        const el = $el.get(0);
        elAnimatedMap.delete(el);
        
        const template = getOriginalContents($el);
        if (template) {
            $el.html(template);
        }
        clearOriginalContents($el);
        removeKnownData($el);
    },

    parse: function (topics) {
        return parseTopics(topics);
    },

    handle: function (value, prop, $el, topics) {
        value = ($.isPlainObject(value) ? value : [].concat(value));

        const { keyAlias, valueAlias } = aliasesFromTopics(topics, value);

        const originalHTML = getOriginalContents($el, ($el)=> $el.html());
        const knownData = getKnownDataForEl($el);
        const missingReferences = findMissingReferences(originalHTML, [keyAlias, valueAlias].concat(Object.keys(knownData)));
        const stubbedTemplate = stubMissingReferences(originalHTML, missingReferences);

        const templateFn = template(stubbedTemplate);
        const $dummyEl = $('<div></div>');
        each(value, function (dataval, datakey) {
            if (dataval === undefined || dataval === null) {
                dataval = dataval + ''; //convert undefineds to strings
            }
            const templateData = $.extend(true, {}, knownData, {
                [keyAlias]: datakey,
                [valueAlias]: dataval
            });

            let nodes;
            let isTemplated;
            try {
                const templated = templateFn(templateData);
                const templatedWithReferences = addBackMissingReferences(templated, missingReferences);
                isTemplated = templatedWithReferences !== stubbedTemplate;
                nodes = $(templatedWithReferences);
            } catch (e) { //you don't have all the references you need;
                nodes = $(stubbedTemplate);
                isTemplated = true;
                updateKnownDataForEl($(nodes), templateData);
            }

            nodes.each(function (i, newNode) {
                const $newNode = $(newNode);
                each($newNode.data(), function (val, key) {
                    $newNode.data(key, toImplicitType(val));
                });
                if (!isTemplated && !$newNode.html().trim()) {
                    $newNode.html(dataval);
                }
            });
            $dummyEl.append(nodes);
        });
        
        const el = $el.get(0);
        const isInitialAnim = !elAnimatedMap.get(el);
        const $withAnimAttrs = addChangeClassesToList($el.children(), $dummyEl.children(), isInitialAnim, animation);
        $el.empty().append($withAnimAttrs);

        elAnimatedMap.set(el, true);
    }
};

export default foreachAttr;
