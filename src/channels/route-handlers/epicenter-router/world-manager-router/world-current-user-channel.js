const F = window.F;

export default function WorldUsersChanngel(worldPromise, notifier) {
    let subsid;

    const am = new F.manager.AuthManager();
    const store = $.extend(true, {
        isMe: true,
        isOnline: true,
    }, am.getCurrentUserSessionInfo());
    const channelManager = new F.manager.ChannelManager();

    return { 
        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            const stillNeedRoles = remainingTopics.indexOf('role') !== -1;
            if (!stillNeedRoles && subsid) {
                worldPromise.then((world)=> {
                    const worldChannel = channelManager.getWorldChannel(world);
                    worldChannel.unsubscribe(subsid);
                });
                subsid = null;
            }
        },
        subscribeHandler: function (userFields) {
            return worldPromise.then((world)=> {
                const session = am.getCurrentUserSessionInfo();
                const myUser = world.users.find((user)=> {
                    return user.userId === session.userId;
                });
                $.extend(store, myUser);
                
                const toNotify = userFields.reduce((accum, field)=> {
                    if (field === '') { //the entire user object
                        accum.push({ name: field, value: store });
                    } else if (store[field] !== undefined) {
                        accum.push({ name: field, value: store[field] });
                    }
                    return accum;
                }, []);
                
                const isSubscribingToRole = userFields.indexOf('role') !== -1;
                if (isSubscribingToRole && !subsid) {
                    const worldChannel = channelManager.getWorldChannel(world);
                    subsid = worldChannel.subscribe('roles', (user, meta)=> {
                        // console.log('Roles notification', user, meta);
                        if (user.userId === store.userId && user.role !== store.role) {
                            store.role = user.role;
                            notifier([{ name: 'role', value: user.role }]);
                        }
                    });
                }
                return toNotify;
            });
        }
    };
}
