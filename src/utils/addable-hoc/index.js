import _ from 'lodash';

export function addable(obj, parser) {
    let handlers = [];
    const boundObj = Object.keys(obj).reduce((accum, key)=> {
        const fn = obj[key];
        accum[key] = fn.bind(fn, handlers);
        return accum;
    }, {});

    return Object.assign({}, boundObj, {
        list: ()=> handlers,
        add: function (name) {
            const args = _.toArray(arguments).slice(1);
            const parsed = parser.apply(null, args);
            parsed.name = name;
            handlers.push(parsed);
        },
        remove: function () {
            handlers = handlers.filter((h)=> h.name !== name);
        },
        replace: function (name, newHandler) {
            handlers = handlers.map((h)=> {
                if (h.name === name) {
                    const newHandler = parser(h);
                    newHandler.name = name;
                    return newHandler;
                }
                return h;
            });
        }
    });
}
