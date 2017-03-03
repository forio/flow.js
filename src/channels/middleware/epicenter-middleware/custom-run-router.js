import runChannelFactory from './run-router-factory';
import { regex, withPrefix, stripSuffixDelimiter } from 'channels/middleware/utils';

var sampleRunidLength = '000001593dd81950d4ee4f3df14841769a0b'.length;
var runidRegex = '(?:.{' + sampleRunidLength + '})';

export default function (options, notifier) {
    if (!options) options = {};

    var opts = {};
    opts.serviceOptions = options.serviceOptions && options.serviceOptions.run ? options.serviceOptions.run : {};
    opts.channelOptions = options.channelOptions;

    return {
        match: regex(runidRegex),
        subscribeHandler: function (topics, prefix) {
            var runid = stripSuffixDelimiter(prefix);
            var channel = runChannelFactory(runid, opts, withPrefix(notifier, prefix));
            return channel.subscribeHandler(topics);
        },
        publishHandler: function (topics, prefix) {
            var runid = stripSuffixDelimiter(prefix);
            var channel = runChannelFactory(runid, opts, withPrefix(notifier, prefix));
            return channel.publishHandler(topics);
        }
    };
}
