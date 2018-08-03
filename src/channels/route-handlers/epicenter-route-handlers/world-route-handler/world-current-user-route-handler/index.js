export default function WorldCurrentUserRouteHandler(config, notifier) {
    const options = $.extend(true, {
        serviceOptions: {},
        channelOptions: {},
    }, config);

    const { getWorld, getSession, getChannel } = options.serviceOptions;

    
    let subsid;

    const store = $.extend(true, {
        isMe: true,
        isOnline: true,
    }, getSession());

    return { 
        unsubscribeHandler: function (unsubscribedTopics, remainingTopics) {
            const stillNeedRoles = remainingTopics.indexOf('role') !== -1;
            if (!stillNeedRoles && subsid) {
                getWorld().then((world)=> {
                    const worldChannel = getChannel(world.id);
                    worldChannel.unsubscribe(subsid);
                });
                subsid = null;
            }
        },
        subscribeHandler: function (userFields) {
            return getWorld().then((world)=> {
                const session = getSession();
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
                    const worldChannel = getChannel(world.id);
                    subsid = worldChannel.subscribe(worldChannel.TOPICS.ROLES, (users, meta)=> {
                        const myUser = users.find((u)=> {
                            return u.userId === session.userId;
                        });
                        if (myUser && myUser.role !== store.role) {
                            store.role = myUser.role;
                            notifier([{ name: 'role', value: myUser.role }]);
                        }
                    });
                }
                return toNotify;
            });
        }
    };
}
