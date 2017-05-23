import { oneOf } from 'utils/functional';
import { regex, withPrefix, prefix as prefixMatch, defaultPrefix } from 'channels/middleware/utils';
import SingleRunChannel from './single-run-channel';

var sampleRunidLength = '000001593dd81950d4ee4f3df14841769a0b'.length;
var runidRegex = '(?:.{' + sampleRunidLength + '})';

export default function RunsRouter(opts, notifier) {

    var customRunChannel = new SingleRunChannel(opts, notifier);

    return {
        match: oneOf(regex(runidRegex), prefixMatch('runs')),

        subscribeHandler: function (topics, prefix) {
            if (prefix.indexOf('runs') === 0) {

            } else {
                return customRunChannel.subscribeHandler(topics, prefix);
            }
        },
        publishHandler: function (topics, prefix) {
            if (prefix.indexOf('runs') === 0) {

            } else {
                return customRunChannel.publishHandler(topics, prefix);
            }
        }
    };
}
