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
