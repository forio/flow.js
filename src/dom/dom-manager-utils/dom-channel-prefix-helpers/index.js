/**
 * 
 * @param {NormalizedTopic[]} topics 
 * @param {string} prefix 
 * @returns {NormalizedTopic[]}
 */
export function addPrefixToTopics(topics, prefix) {
    if (!prefix) {
        return topics;
    }
    const mappedTopics = topics.map((topic)=> {
        const currentName = topic.name;
        const hasChannelDefined = currentName.indexOf(':') !== -1;
        if (!hasChannelDefined) {
            topic.name = `${prefix}:${currentName}`;
        }
        return topic;
    });
    return mappedTopics;
}

const DEFAULT_OPERATIONS_PREFIX = 'operations:';
const DEFAULT_VARIABLES_PREFIX = 'variables:';

export function addDefaultPrefix(name, source, channelPrefix) {
    const isUnprefixed = name.indexOf(':') === -1;

    const defaultPrefix = source.indexOf('on-') === 0 ? DEFAULT_OPERATIONS_PREFIX : DEFAULT_VARIABLES_PREFIX;
    const needsDefaultPrefix = defaultPrefix !== DEFAULT_VARIABLES_PREFIX;

    if (isUnprefixed && needsDefaultPrefix) {
        name = `${defaultPrefix}${name}`;
    }
    const hasDefaultPrefix = name.indexOf(defaultPrefix) === 0;
    if ((isUnprefixed || hasDefaultPrefix) && channelPrefix) {
        name = `${channelPrefix}:${name}`;
    }
    return name;
}
