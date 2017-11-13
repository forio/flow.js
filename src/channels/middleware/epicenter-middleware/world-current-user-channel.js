import _ from 'lodash';

const F = window.F;

export default function WorldUsersChanngel(worldPromise, notifier) {
    let subsid;

    const am = new F.manager.AuthManager();
    const store = am.getCurrentUserSessionInfo();

    worldPromise.then((world)=> {
       
    });
    
    return { 
        unsubscribeHandler: function (userid) {
            // delete subscribedUsers[userid];
            // if (!Object.keys(subscribedUsers).length) {
            //     notificationsChannel.unsubscribe(subsid);
            //     subsid = null;
            // }
        },
        subscribeHandler: function (userFields) {
            worldPromise.then((world)=> {
                const session = am.getCurrentUserSessionInfo();
                const myUser = _.find(world.users, (user)=> {
                    return user.userId === session.userId;
                });
                $.extend(store, myUser);
                
                const toNotify = userFields.reduce((accum, field)=> {
                    if (store[field] !== undefined) {
                        accum.push({ name: field, value: store[field] });
                    }
                    return accum;
                }, []);
                notifier(toNotify);
                
                if (!subsid) {
                    const channelManager = new F.manager.ChannelManager();
                    const worldChannel = channelManager.getWorldChannel(world);
                    subsid = worldChannel.subscribe('roles', (user, meta)=> {
                        console.log('Roles notification', user, meta);
                        if (user.userId === store.userId && user.role !== store.role) {
                            store.role = user.role;
                            notifier([{ name: 'role', value: user.role }]);
                        }
                    });
                }
            });
        }
    };
}
