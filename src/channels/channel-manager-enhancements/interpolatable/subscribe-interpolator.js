import { extractInterpolatedFromString, interpolateWithVariables } from './interpolatable-utils';
var { uniq } = _;

/**
 * @param {String[]} topics
 * @return {String[]} interpolated
 */
export function getVariablesToInterpolate(topics) {
    var deps = topics.reduce((accum, topic)=> {
        var inner = extractInterpolatedFromString(topic);
        accum = accum.concat(inner);
        return accum;
    }, []);
    return uniq(deps);
}

/**
 * @param {String[]} topics
 * @param {Object} data
 * @return {String[]}
 */
export function interpolateTopicsWithVariables(topics, data) {
    return topics.map((topic) => {
        return interpolateWithVariables(topic, data);
    });
}

export function mergeInterpolatedTopicsWithData(originalTopics, interpolatedTopics, data) {
    return interpolatedTopics.reduce((accum, interpolatedTopic, index)=> {
        var original = originalTopics[index];
        var val = data[interpolatedTopic];
        if (val !== undefined) {
            accum[original] = data[interpolatedTopic];
        }
        return accum;
    }, {});
}

export default function subscribeInterpolator(subscribeFn, interceptionCallback) {
    return function interpolatedSubscribe(topics, cb, options) {
        topics = [].concat(topics);
        var innerVariables = getVariablesToInterpolate(topics);
        if (!innerVariables.length) {
            return subscribeFn(topics, cb, options);
        }
        var innerSubsId = subscribeFn(innerVariables, function handleInnerVariableChange(data, innerVariablesMeta) {
            var interpolatedTopics = interpolateTopicsWithVariables(topics, data);

            var outerSubsId = subscribeFn(interpolatedTopics, function handleInterpolatedVariableChange(actualData) {
                var toSendback = mergeInterpolatedTopicsWithData(topics, interpolatedTopics, actualData);
                cb(toSendback);
            }, options);

            (interceptionCallback || $.noop)(innerVariablesMeta.id, outerSubsId);

            return outerSubsId;

        }, { autoFetch: true, batch: true });

        return innerSubsId;
    };
}
