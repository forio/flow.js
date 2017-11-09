const F = window.F;

export default function UsersPresenceChannel(userListPromise, notifier) {

    const cm = new F.manager.ChannelManager();
    const presenceChannel = cm.getPresenceChannel();
    let subsid;

    const subscribedUsers = {};

    const parsedUsersPromise = userListPromise.then((users)=> {
        const am = new F.manager.AuthManager();
        const session = am.getCurrentUserSessionInfo();
        return users.map((u)=> {
            u.name = u.lastName;
            u.isMe = u.userId === session.userId;
            return u;
        });
    });
    return { 
        unsubscribeHandler: function (userid) {
            delete subscribedUsers[userid];
            if (!Object.keys(subscribedUsers).length) {
                presenceChannel.unsubscribe(subsid);
                subsid = null;
            }
        },
        subscribeHandler: function (userids) {
            return parsedUsersPromise.then((users)=> {
                if (!subsid) {
                    subsid = presenceChannel.subscribe('', (data)=> {
                        console.log('presence stuff', data);
                    });
                }
                const validUserIds = userids.filter((u)=> u.trim());
                if (!validUserIds.length) {
                    return notifier([{ name: '', value: users }]);
                }
                validUserIds.forEach((userid)=> {
                    subscribedUsers[userid] = true;
                });
            });
            
        }
    };
}
