export default function MiddlewareManager(options, notifier, channelManagerContext) {
    var defaults = {
        middlewares: []
    };
    var opts = $.extend(true, {}, defaults, options);
    var optsToPassOn = _.omit(opts, Object.keys(defaults));

    var list = [];
    var publicAPI = {
        list: list,

        add: function (middleware, index) {
            if (_.isFunction(middleware)) {
                //FIXME: move channelManagerContext functionality to router
                middleware = new middleware(optsToPassOn, notifier, channelManagerContext);
            }
            $.extend(channelManagerContext, middleware.expose); //add any public props middleware wants to expose
            list.push(middleware);
        },

        filter: function (type) {
            type = type + 'Handler';
            return list.reduce(function (accum, m) {
                if (m[type]) {
                    accum.push(m[type]);
                }
                return accum;
            }, []);
        }
    };

    $.extend(this, publicAPI);
    opts.middlewares.forEach(this.add);
}