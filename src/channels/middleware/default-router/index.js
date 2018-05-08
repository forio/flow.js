import router from '../../channel-router';

//FIXME: This doesn't handle add-route
export default function (config, notifier, channelManagerContext) {
    const options = $.extend(true, {}, {
        routes: [],
    }, config);

    const routes = options.routes.map((r)=> {
        const router = (typeof r === 'function') ? new r(config, notifier) : r;
        if (typeof router.match === 'string') {
            const oldMatch = router.match;
            router.match = (t)=> t === oldMatch;
        }

        return router;
    });
    var defaultRouter = router(routes, notifier);
    defaultRouter.subscribeHandler = (topics, options)=> {
        const parsed = topics.reduce((accum, topic)=> {
            const matchingRoute = routes.find((route)=> {
                return (route.match(topic) && route.subscribeHandler);
            });
            if (matchingRoute) {
                const value = matchingRoute.subscribeHandler(topic);
                accum.claimed.push({
                    name: topic,
                    value: value
                });
            } else {
                accum.rest.push(topic);
            }
            return accum;
        }, { claimed: [], rest: [] });
        if (parsed.claimed.length) {
            setTimeout(()=> {
                notifier(parsed.claimed);
            }, 0);
            return parsed.rest;
        }
        return topics;
    };

    defaultRouter.publishHandler = (topics, options)=> {
        const parsed = topics.reduce((accum, topic)=> {
            const matchingRoute = routes.find((route)=> {
                return (route.match(topic.name) && route.publishHandler);
            });
            if (matchingRoute) {
                const value = matchingRoute.publishHandler(topic);
                accum.claimed.push(value);
            } else {
                accum.rest.push(topic);
            }

            return accum;
        }, { claimed: [], rest: [] });

        if (parsed.claimed.length) {
            setTimeout(()=> {
                notifier(parsed.claimed);
            }, 0);
            return parsed.rest;
        }
        return topics;
    };

    defaultRouter.expose = { router: defaultRouter };
    return defaultRouter;
}
