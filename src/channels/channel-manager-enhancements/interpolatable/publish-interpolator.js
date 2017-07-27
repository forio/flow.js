import { extractInterpolatedFromString, interpolateWithVariables } from './interpolatable-utils';
import { normalizeParamOptions } from 'channels/channel-utils';

/**
 * @param {Publishable[]} publishInputs
 * @returns {String[]} inner variables to resolve
 */
export function getInterpolatedVariables(publishInputs) {
    return publishInputs.reduce((accum, input)=> {
        var inner = extractInterpolatedFromString(input.name);
        accum = accum.concat(inner);
        return accum;
    }, []);
}

/**
 * @param {Publishable[]} publishInputs
 * @param {Object} valuesToInterpolate
 * @returns {Publishable[]} inner variables to resolve
 */
export function interpolateInputsWithVariables(publishInputs, valuesToInterpolate) {
    return publishInputs.map((ip) => {
        return {
            name: interpolateWithVariables(ip.name, valuesToInterpolate),
            value: ip.value,
        };
    });
}

export default function publishInterpolator(publishFunction, fetchFn) {
    return function interpolatedPublishfunction(topic, value, options) {
        var normalizedPublishInputs = normalizeParamOptions(topic, value, options);
        var innerVariables = getInterpolatedVariables(normalizedPublishInputs.params);
        if (!innerVariables.length) {
            return publishFunction(topic, value, options);
        }
        
        var prom = $.Deferred();
        fetchFn(innerVariables, function handleInnerVariableChange(innerData, innerVariablesMeta) {
            var interpolated = interpolateInputsWithVariables(normalizedPublishInputs.params, innerData);
            var newPublishProm = publishFunction(interpolated, normalizedPublishInputs.options);
            prom.resolve(newPublishProm);
        });
        return prom.promise();
    };
}
