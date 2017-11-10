const F = window.F;

export default function WorldUsersChanngel(worldPromise, notifier) {
    let subsid;

    const store = {
        users: [],
        mark: (userid, isOnline)=> {
            store.users = store.users.map((u)=> {
                if (u.userId === userid) {
                    u.isOnline = isOnline;
                }
                return u;
            });
            return store.users;
        }
    };

    // const p = new F.service.presence();
    const parsedUsersPromise = worldPromise.then((world)=> {
        const am = new F.manager.AuthManager();
        const session = am.getCurrentUserSessionInfo();
        const parsed = world.users.map((u)=> {
            u.name = u.lastName;
            u.isMe = u.userId === session.userId;
            u.isOnline = u.isMe; //Assume i'm the only online one by default
            return u;
        });
        store.users = parsed;
        return parsed;
    });
    
    return { 
        unsubscribeHandler: function (userid) {
            // delete subscribedUsers[userid];
            // if (!Object.keys(subscribedUsers).length) {
            //     notificationsChannel.unsubscribe(subsid);
            //     subsid = null;
            // }
        },
        subscribeHandler: function (userids) {
            if (!subsid) {
                worldPromise.then((world)=> {
                    const channelManager = new F.manager.ChannelManager();
                    const worldChannel = channelManager.getWorldChannel(world);

                    worldChannel.subscribe('presence', (user, meta)=> {
                        console.log('presence', user, meta);
                        const userid = user.id;
                        store.mark(userid, user.isOnline);

                        return notifier([{ name: '', value: store.users }]);

                    }, { includeMine: false });
                });
            }
            return parsedUsersPromise.then((users)=> {
                return notifier([{ name: '', value: users }]);
            });
        }
    };
}
