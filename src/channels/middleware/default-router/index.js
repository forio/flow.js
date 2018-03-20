import router from '../../channel-router';

export default function (config, notifier, channelManagerContext) {
    const options = $.extend(true, {}, {
        routes: [],
    }, config);

    const routes = options.routes.map((r)=> {
        if (typeof r === 'function') {
            return new r(config, notifier);
        }
        return r;
    });
    var defaultRouter = router(routes, notifier);
    defaultRouter.expose = { router: defaultRouter };
    return defaultRouter;
}
