import router from '../../channel-router';
import { toImplicitType } from 'utils/parse-utils';

export default function (config, notifier, channelManagerContext) {
    const options = $.extend(true, {}, {
        routes: [],
    }, config);

    const routes = options.routes.map((r)=> {
        const router = (typeof r === 'function') ? new r(config, notifier) : r;
        const oldSubsHandler = router.subscribeHandler;

        if (typeof router.match === 'string') {
            const oldMatch = router.match;
            router.match = (t)=> t === oldMatch;
        }

        router.subscribeHandler = (topics)=> {
            const parsed = topics.reduce((accum, t)=> {
                if (router.match(t)) {
                    accum.claimed.push({
                        name: t,
                        value: oldSubsHandler(t)
                    });
                } else {
                    accum.rest.push(t);
                }
                return accum;
            }, { claimed: [], rest: [] });
            setTimeout(()=> {
                if (parsed.claimed.length) {
                    notifier(parsed.claimed);
                }
            }, 0);
            return parsed.rest;
        };
        return router;
    });
    var defaultRouter = router(routes, notifier);
    const oldHandler = defaultRouter.subscribeHandler;
    defaultRouter.subscribeHandler = (topics, options)=> {
        const parsed = topics.reduce((accum, topic)=> {
            routes.forEach((route)=> {
                if (route.match(topic)) {
                    accum.claimed.push(topic);
                } else {
                    accum.rest.push(topic);
                }
            });
            return accum;
        }, { claimed: [], rest: [] });
        if (parsed.claimed.length) {
            oldHandler(parsed.claimed);
            return parsed.rest;
        }
       return topics;
    };

    defaultRouter.expose = { router: defaultRouter };
    return defaultRouter;
}
