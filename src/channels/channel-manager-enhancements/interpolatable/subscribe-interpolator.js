import { extractDependencies, interpolateWithValues } from './interpolatable-utils';
import { uniq, isEqual } from 'lodash';

/**
 * @param {string[]} topics
 * @returns {string[]} interpolated
 */
export function getDependencies(topics) {
    var deps = topics.reduce((accum, topic)=> {
        var inner = extractDependencies(topic);
        accum = accum.concat(inner);
        return accum;
    }, []);
    return uniq(deps);
}

/**
 * @param {string[]} topics
 * @param {Object} data
 * @returns {string[]}
 */
export function interpolateWithDependencies(topics, data) {
    return topics.map((topic)=> {
        return interpolateWithValues(topic, data);
    });
}

/**
 * @param  {string[]} originalTopics     
 * @param  {string[]} interpolatedTopics 
 * @param  {Object} data               
 * @returns {Object}                    Interpolated
 */
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

/**
 * Takes a subscribe function and resolves any interpolated inputs
 * @param  {Function} subscribeFn        function to wrap
 * @param  {Function} onDependencyChange callback function when any dependencies change
 * @returns {Function}                    wrapped function
 */
export default function subscribeInterpolator(subscribeFn, onDependencyChange) {
    return function interpolatedSubscribe(topics, cb, options) {
        topics = [].concat(topics);
        var dependencies = getDependencies(topics);
        if (!dependencies.length) {
            return subscribeFn(topics, cb, options);
        }
        var innerSubsId = subscribeFn(dependencies, function handleDependencyValueChange(data, dependenciesMeta) {
            const isSameData = isEqual(data, dependenciesMeta.previousData);
            if (isSameData) return;

            var interpolatedTopics = interpolateWithDependencies(topics, data);
            var outerSubsId = subscribeFn(interpolatedTopics, function handleInterpolatedValueChange(actualData, actualMeta) {
                var toSendback = mergeInterpolatedTopicsWithData(topics, interpolatedTopics, actualData);

                cb(toSendback, actualMeta);
            }, options);

            (onDependencyChange || $.noop)(dependenciesMeta.id, outerSubsId);
            return outerSubsId;
        }, $.extend(options, { autoFetch: true, batch: true }));

        return innerSubsId;
    };
}
