// import { normalizeParamOptions } from './channel-utils';

var { isArray } = _;

/**
 * @param {String[]} topics
 * @return {String[]} interpolated
 */
function getVariablesToInterpolate(topics) {
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
 * @params {Object} data
 * @return {String[]}
 */
function interpolateWithVariables(topics, data) {
    return topics.reduce((accum, topic) => {
        var interpolatedTopic = topic.replace(/<(.*?)>/g, (match, inner)=> {
            var val = data[inner];
            var toReplace = isArray(val) ? val[val.length - 1] : val;
            return toReplace;
        });
        
        accum = accum.concat(interpolatedTopic);
        return accum;
    }, []);
}

function addbackInterpolation(originalTopics, interpolatedTopics, data) {
    return interpolatedTopics.reduce((accum, interpolatedTopic, index)=> {
        var original = originalTopics[index];
        accum[original] = data[interpolatedTopic];
        return accum;
    }, {});
}

export default function interpolatable(channelManager) {
    var subscribeFn = channelManager.subscribe.bind(channelManager);
    var unsubscribeFn = channelManager.unsubscribe.bind(channelManager);
    var publishFn = channelManager.publish.bind(channelManager);
    return {
        subscribe: (topics, cb, options)=> {
            topics = [].concat(topics);
            var variablesToInterpolate = getVariablesToInterpolate(topics);
            if (!variablesToInterpolate.length) {
                return subscribeFn(topics, cb, options);
            }
            var subsid = subscribeFn(variablesToInterpolate, (data)=> {
                var interpolatedTopics = interpolateWithVariables(topics, data);
                var newsubsid = subscribeFn(interpolatedTopics, (actualData)=> {
                    var toSendback = addbackInterpolation(topics, interpolatedTopics, actualData);
                    cb(toSendback);
                }, options);
                return newsubsid;

            }, { autoFetch: true, batch: true });

            return subsid;
        },

        notify: channelManager.notify.bind(channelManager),

        publish: function (topic, value, options) {
            // var normalized = normalizeParamOptions(topic, value, options);
            
            return channelManager.publish.apply(channelManager, arguments);
        },

        unsubscribe: ()=> {
            //check if it's an interpolated subsid. 
            // if yes, get the underlying subsid and unsubscribe
        },

    };
}
