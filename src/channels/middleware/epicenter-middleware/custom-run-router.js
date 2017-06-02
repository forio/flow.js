import runChannelFactory from './run-router-factory';
import { withPrefix, stripSuffixDelimiter } from 'channels/middleware/utils';

export default function (options, notifier) {
    if (!options) options = {};

    var opts = {};
    opts.serviceOptions = options.serviceOptions && options.serviceOptions.run ? options.serviceOptions.run : {};
    opts.channelOptions = options.channelOptions;

    return {
        subscribeHandler: function (topics, options, prefix) {
            var runid = stripSuffixDelimiter(prefix);
            //FIXME: Should i merge options here?
            var channel = runChannelFactory(runid, opts, withPrefix(notifier, prefix));
            return channel.subscribeHandler(topics, options, prefix);
        },
        publishHandler: function (topics, prefix) {
            var runid = stripSuffixDelimiter(prefix);
            var channel = runChannelFactory(runid, opts, withPrefix(notifier, prefix));
            return channel.publishHandler(topics);
        }
    };
}
