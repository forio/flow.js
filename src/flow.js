import domManager from './dom/dom-manager';

import ChannelManager from 'channels/configured-channel-manager';
import config from 'config';

import * as utils from './utils';

const Flow = {
    dom: domManager,
    utils: utils,
    initialize: function (config) {
        const model = $('body').data('f-model');
        const defaults = {
            channel: {
                //FIXME: Defaults can't be here..
                defaults: {
                    run: {
                        model: model,
                    }
                },
            },
            dom: {
                root: 'body',
                autoBind: true
            }
        };

        const options = $.extend(true, {}, defaults, config);
   
        if (config && config.channel && (config.channel instanceof ChannelManager)) {
            this.channel = config.channel;
        } else {
            this.channel = new ChannelManager(options.channel);
        }

        const prom = domManager.initialize($.extend(true, {
            channel: this.channel
        }, options.dom));
        
        this.channel.subscribe('operations:reset', function () {
            domManager.unbindAll();
            domManager.bindAll();
        });

        return prom;
    }
};
Flow.ChannelManager = ChannelManager;
Flow.constants = config;
//set by grunt
if (RELEASE_VERSION) Flow.version = RELEASE_VERSION; //eslint-disable-line no-undef
export default Flow;
