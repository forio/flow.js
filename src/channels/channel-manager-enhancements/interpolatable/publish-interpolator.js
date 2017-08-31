import { extractDependencies, interpolateWithValues } from './interpolatable-utils';
import { normalizeParamOptions } from 'channels/channel-utils';

import { uniq } from 'lodash';

/**
 * @param {Publishable[]} publishInputs
 * @returns {String[]} dependencies for inputs
 */
export function getDependencies(publishInputs) {
    var deps = publishInputs.reduce((accum, input)=> {
        var inner = extractDependencies(input.name);
        accum = accum.concat(inner);
        return accum;
    }, []);
    return uniq(deps);
}

/**
 * @param {Publishable[]} publishInputs
 * @param {Object} valuesToInterpolate
 * @returns {Publishable[]} inputs with resolved dependencies
 */
export function interpolateWithDependencies(publishInputs, valuesToInterpolate) {
    return publishInputs.map((ip) => {
        return {
            name: interpolateWithValues(ip.name, valuesToInterpolate),
            value: ip.value,
        };
    });
}

/**
 * Publish function to wrap
 * @param  {Function} publishFunction
 * @param  {Function} fetchFn         function to get interpolated values from
 * @return {Function}                 wrapped function
 */
export default function publishInterpolator(publishFunction, fetchFn) {
    return function interpolatedPublishfunction(topic, value, options) {
        var normalizedPublishInputs = normalizeParamOptions(topic, value, options);
        var dependencies = getDependencies(normalizedPublishInputs.params);
        if (!dependencies.length) {
            return publishFunction(topic, value, options);
        }
        
        var prom = $.Deferred();
        fetchFn(dependencies, function handleDependencyChange(resolvedDependencies) {
            var interpolated = interpolateWithDependencies(normalizedPublishInputs.params, resolvedDependencies);
            var newPublishProm = publishFunction(interpolated, normalizedPublishInputs.options);
            prom.resolve(newPublishProm);
        });
        return prom.promise();
    };
}
