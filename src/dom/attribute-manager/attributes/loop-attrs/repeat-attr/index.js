import { template, each, isEmpty } from 'lodash';
import { toImplicitType } from 'utils/parse-utils';
import { random } from 'utils/general';
import { attrs, animation } from 'config';

const templateIdAttr = attrs.repeat.templateId;

import { addChangeClassesToList } from 'utils/animation';

const elAnimatedMap = new WeakMap(); //TODO: Can probably get rid of this if we make subscribe a promise and distinguish between initial value

import { getKnownDataForEl, updateKnownDataForEl, removeKnownData, findMissingReferences, stubMissingReferences, addBackMissingReferences, getOriginalContents, clearOriginalContents } from 'dom/attribute-manager/attr-template-utils';

import { aliasesFromTopics, parseTopics } from '../loop-attr-utils';

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
        }

        const el = $el.get(0);
        elAnimatedMap.delete(el);

        const originalHTML = getOriginalContents($el);
        const current = $el.get(0).outerHTML;
        if (originalHTML && current !== originalHTML) {
            // TEMPLATE-570: Restore the element to its pristine template form by resetting only its inner
            // content, keeping the element itself and its current attributes. We intentionally
            // do NOT replace the whole element with the captured snapshot: the snapshot is taken
            // on first render, so replacing would revert any later edit to the element's own
            // attributes (e.g. changing data-f-repeat in the interface builder) and detach the
            // live node, discarding the change.
            const templateInnerHTML = $(originalHTML).html();
            $el.html(templateInnerHTML);
            $el.removeAttr('hidden');
            // Drop the render-time bookkeeping id so the element is restored to its pristine
            // template form. The old replaceWith(originalHTML) removed it implicitly; since we now
            // keep the live node we must strip it explicitly. Removed here (after the sibling
            // cleanup above, which still needs the id) rather than in the `if (id)` block.
            $el.removeAttr('data-' + templateIdAttr);
        }
        clearOriginalContents($el);
        removeKnownData($el);
    },

    parse: function (topics) {
        return parseTopics(topics);
    },

    init: function (attr, value, $el) {
        
    },

    handle: function (value, prop, $el, topics) {
        value = ($.isPlainObject(value) ? value : [].concat(value));
        let id = $el.data(templateIdAttr);
        
        $el.removeAttr('hidden');
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
            $el.attr('hidden', true); //There's always going to be 1 el otherwise
            return;
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
