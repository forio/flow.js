import _ from 'lodash';
import { objectToArray, arrayToObject } from 'channels/channel-utils';

const F = window.F;

export default function (options, notifier) {
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
            setTimeout(()=> {
                //FIXME: Returning this instantly makes this give data back faster than the subscription has happened
                //Because middleware executes this first before getting subsid back
                //Fix by making subscribes promise based?
                notifier(objectToArray(response));
            }, 0);
            return response;
        },
        publishHandler: function (topics, options, prefix) {
            //login, logout are only operations supported
            const $def = $.Deferred();
            const res = topics.forEach((topic)=> {
                const handler = supportedActions[topic.name];
                if (handler) {
                    handler(topic.value);
                }
            });
            return $def.promise();
        }
    };
}
