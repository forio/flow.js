import { template, each, isEmpty } from 'lodash';
import { toImplicitType } from 'utils/parse-utils';
import { random } from 'utils/general';
import { attrs, animation } from '../../../../config';

const templateIdAttr = attrs.repeat.templateId;

import { addChangeClassesToList } from 'utils/animation';

const elAnimatedMap = new WeakMap(); //TODO: Can probably get rid of this if we make subscribe a promise and distinguish between initial value

import { getKnownDataForEl, updateKnownDataForEl, removeKnownData, findMissingReferences, stubMissingReferences, addBackMissingReferences, getOriginalContents, clearOriginalContents } from '../../attr-template-utils';

import { aliasesFromTopics, parseTopics } from '../loop-attr-utils';
import hideifHandler from '../../toggles/hide-if-attr';

/**
 * @type AttributeHandler 
 */
const loopAttrHandler = {
    test: 'repeat',

    target: '*',

    unbind: function (attr, $el) {
        var id = $el.data(templateIdAttr);
        if (id) {
            $el.nextUntil(':not([data-' + id + '])').remove();
            // $el.removeAttr('data-' + templateIdAttr); //FIXME: Something about calling rebind multiple times in IB makes this happen without the removal
        }

        const el = $el.get(0);
        elAnimatedMap.delete(el);

        const originalHTML = getOriginalContents($el);
        const current = $el.get(0).outerHTML;
        if (originalHTML && current !== originalHTML) {
            $el.replaceWith(originalHTML);
        }
        clearOriginalContents($el);
        removeKnownData($el);
    },

    parse: function (topics) {
        return parseTopics(topics);
    },

    handle: function (value, prop, $el, topics) {
        value = ($.isPlainObject(value) ? value : [].concat(value));
        let id = $el.data(templateIdAttr);
        
        const originalHTML = getOriginalContents($el, ($el)=> $el.get(0).outerHTML);

        const $dummyOldDiv = $('<div></div>');
        if (id) {
            const $removed = $el.nextUntil(':not([data-' + id + '])').remove();
            $dummyOldDiv.append($removed);
        } else {
            id = random('repeat-');
            $el.attr('data-' + templateIdAttr, id);
        }

        const { keyAlias, valueAlias } = aliasesFromTopics(topics, value);

        const knownData = getKnownDataForEl($el);
        const missingReferences = findMissingReferences(originalHTML, [keyAlias, valueAlias].concat(Object.keys(knownData)));
        const stubbedTemplate = stubMissingReferences(originalHTML, missingReferences);

        if (isEmpty(value)) {
            $el.attr('hidden', 'true'); //There's always going to be 1 el otherwise
        } else {
            $el.removeAttr('hidden');
        }

        const templateFn = template(stubbedTemplate);
        let last;
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

            var hasData = (dataval !== null && dataval !== undefined);
            nodes.each(function (i, newNode) {
                const $newNode = $(newNode);
                $newNode.removeAttr('data-f-repeat').removeAttr('data-' + templateIdAttr);
                each($newNode.data(), function (val, key) {
                    if (!last) {
                        $el.data(key, toImplicitType(val));
                    } else {
                        $newNode.data(key, toImplicitType(val));
                    }
                });
                $newNode.attr('data-' + id, true);
                if (!isTemplated && !$newNode.children().length && hasData) {
                    $newNode.html(dataval + '');
                }
            });
            if (!last) {
                last = $el.html(nodes.html());
            } else {
                last = nodes.insertAfter(last);
            }
        });

        const $newEls = $el.nextUntil(`:not('[data-${id}]')`);

        const el = $el.get(0);
        const isInitialAnim = !elAnimatedMap.get(el);
        addChangeClassesToList($dummyOldDiv.children(), $newEls, isInitialAnim, animation);

        elAnimatedMap.set(el, true);
    }
};

export default loopAttrHandler;
