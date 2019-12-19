const F = window.F;

export default function WorldUsersRouteHandler(config, notifier) {
    const options = $.extend(true, {
        serviceOptions: {},
        channelOptions: {},
    }, config);

    const { getWorld, getSession, getChannel } = options.serviceOptions;

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

    const parsedUsersPromise = getWorld().then((world)=> {
        const session = getSession();
        const parsed = world.users.map((u)=> {
            u.name = u.lastName;
            u.isMe = u.userId === session.userId;
            u.isOnline = u.isMe; //Assume i'm the only online one by default
            return u;
        });
        store.users = parsed;
        return parsed;
    });

    let presenceSubsId;
    return {
        unsubscribeHandler: function (knownTopics, remainingTopics) {
            if (remainingTopics.length || !presenceSubsId) {
                return;
            }
            getWorld().then((world)=> {
                const worldChannel = getChannel(world.id);
                worldChannel.unsubscribe(presenceSubsId);
                presenceSubsId = null;
            });

        },
        subscribeHandler: function (userids) {
            if (!presenceSubsId) {
                //TODO: Also listen to roles channel to update users
                getWorld().then((world)=> {
                    const worldChannel = getChannel(world.id);
                    presenceSubsId = worldChannel.subscribe(worldChannel.TOPICS.PRESENCE, (user, meta)=> {
                        const userid = user.id;
                        store.mark(userid, user.isOnline);
                        return notifier([{ name: '', value: store.users }]);
                    }, { includeMine: false });
                });
            }
            return parsedUsersPromise.then((users)=> {
                return [{ name: '', value: users }];
            });
        },
        publishHandler: function (topics, options) {
            const ps = new F.service.Presence();
            topics.forEach((topic)=> {
                const split = topic.name.split(':');
                if (split[1]) {
                    if (split[1] === 'markOnline') {
                        ps.markOnline(split[0]);
                    } else if (split[1] === 'markOffline') {
                        ps.markOffline(split[0]);
                    }
                }
            });
            return topics;
        }
    };
}
