import _ from 'lodash';
import { objectToPublishable } from 'channels/channel-utils';

const F = window.F;

export default function UserRouteHandler(options, notifier) {
    if (!options) options = {};
    const am = new F.manager.AuthManager(options.serviceOptions);

    function getState() {
        const session = am.getCurrentUserSessionInfo();
        const state = $.extend(true, {}, session, {
            isLoggedIn: Object.keys(session).length > 0
        });
        return state;
    }

    const supportedActions = {
        login: ()=> {

        },
        logout: ()=> {
            am.logout();
        }
    };
    return {
        subscribeHandler: function (topics, options, prefix) {
            const response = _.pick(getState(), topics);
            return objectToPublishable(response);
        },
        publishHandler: function (topics, options, prefix) {
            //login, logout are only operations supported
            const $def = $.Deferred();
            topics.forEach((topic)=> {
                const handler = supportedActions[topic.name];
                if (handler) {
                    handler(topic.value);
                }
            });
            return $def.promise();
        }
    };
}
