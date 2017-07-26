var { isArray } = _;

/**
 * @param {String[]} topics
 * @return {String[]} interpolated
 */
export function getVariablesToInterpolate(topics) {
    return topics.reduce((accum, topic)=> {
        var inner = (topic.match(/<(.*?)>/g) || []).map((val) => {
            return val.substring(1, val.length - 1); 
        });
        accum = accum.concat(inner);
        return accum;
    }, []);
}

/**
 * @param {String[]} topics
 * @param {Object} data
 * @return {String[]}
 */
export function interpolateTopicsWithVariables(topics, data) {
    return topics.map((topic) => {
        var interpolatedTopic = topic.replace(/<(.*?)>/g, (match, inner)=> {
            var val = data[inner];
            var toReplace = isArray(val) ? val[val.length - 1] : val;
            return toReplace;
        });
        return interpolatedTopic;
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

export default function subscribeInterceptor(subscribeFn) {
    return function interceptedSubscribe(topics, cb, options) {
        topics = [].concat(topics);
        var variablesToInterpolate = getVariablesToInterpolate(topics);
        if (!variablesToInterpolate.length) {
            return subscribeFn(topics, cb, options);
        }
        var subsid = subscribeFn(variablesToInterpolate, function handleInnerVariableChange(data) {
            var interpolatedTopics = interpolateTopicsWithVariables(topics, data);
            var newsubsid = subscribeFn(interpolatedTopics, function handleInterpolatedVariableChange(actualData) {
                var toSendback = mergeInterpolatedTopicsWithData(topics, interpolatedTopics, actualData);
                cb(toSendback);
            }, options);
            return newsubsid;

        }, { autoFetch: true, batch: true });

        return subsid;
    };
}
