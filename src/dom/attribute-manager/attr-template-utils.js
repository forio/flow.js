import { uniqueId } from 'lodash';

const CURRENT_INDEX_KEY = 'current-index';
const CURRENT_INDEX_ATTR = `data-${CURRENT_INDEX_KEY}`;

export function getKnownDataForEl($el) {
    const closestKnownDataEl = $el.closest(`[${CURRENT_INDEX_ATTR}]`);
    let knownData = {};
    if (closestKnownDataEl.length) {
        knownData = closestKnownDataEl.data(CURRENT_INDEX_KEY);
    }
    return knownData;
}
export function updateKnownDataForEl($el, data) {
    $el.attr(CURRENT_INDEX_ATTR, JSON.stringify(data));
}
export function removeKnownData($el) {
    $el.removeAttr(CURRENT_INDEX_ATTR);
}

export function getTemplateTags(template) {
    template = template.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const templateTagsUsed = template.match(/<%[=-]?([\s\S]+?)%>/g);
    return templateTagsUsed || [];
}
export function isTemplated(template) {
    return getTemplateTags(template).length > 0;
}


export function findMissingReferences(template, knownDataKeys) {
    function isKnownTag(tag, knownTags) {
        const match = knownDataKeys.find((key)=> {
            const regex = new RegExp('\\b' + key + '\\b');
            return regex.test(tag);
        });
        return match;
    }

    template = template.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const missingReferences = {};
    const templateTagsUsed = getTemplateTags(template);
    if (templateTagsUsed) {
        templateTagsUsed.forEach(function (tag) {
            if (tag.match(/\w+/) && !isKnownTag(tag, knownDataKeys)) {
                let refKey = missingReferences[tag];
                if (!refKey) {
                    refKey = uniqueId('no-ref');
                    missingReferences[tag] = refKey;
                }
            }
        });
    }
    return missingReferences;
}

function refToMarkup(refKey) {
    return '<!--' + refKey + '-->';
}

export function stubMissingReferences(template, missingReferences) {
    template = template.replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    Object.keys(missingReferences).forEach((tag)=> {
        const refId = missingReferences[tag];
        const r = new RegExp(tag, 'g');
        template = template.replace(r, refToMarkup(refId));
    });
    return template;
}

export function addBackMissingReferences(template, missingReferences) {
    Object.keys(missingReferences).forEach((originalTemplateVal)=> {
        const commentRef = missingReferences[originalTemplateVal];
        const r = new RegExp(refToMarkup(commentRef), 'g');
        template = template.replace(r, originalTemplateVal);
    });

    return template;
}


const elTemplateMap = new WeakMap();
export function getOriginalContents($el, resolver) {
    const el = $el.get(0);
    let originalHTML = elTemplateMap.get(el);
    if (!originalHTML && resolver) {
        originalHTML = resolver($el).replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        elTemplateMap.set(el, originalHTML);
    }
    return originalHTML;
}
export function clearOriginalContents($el) {
    const el = $el.get(0);
    elTemplateMap.delete(el);
}
