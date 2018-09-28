const _ = require('lodash');

export function create(str) {
    var div = document.createElement('div');
    div.innerHTML = str.trim();
    return (div.childNodes.length === 1) ? div.childNodes[0] : div.childNodes;
}

export function createDummyChannel(options, knownData) {
    //TODO: Just replace this with the actual channel manager?
    var dummyChannel = function () {
        var i = 0;
        const subsMap = {};
        if (!knownData) {
            knownData = {};
        }

        function notifySubs(subs, data) {
            const knownKeys = Object.keys(data);
            if (subs && _.intersection(knownKeys, subs.variables).length === subs.variables.length) {
                const dataToSend = _.pick(data, subs.variables);
                // console.log('notify', dataToSend, subs, subsid);
                subs.callback(dataToSend);
            }
        }
        return {
            publish: sinon.spy((data)=> {
                // console.log('Publishing', data);
                $.extend(knownData, data);
                Object.keys(subsMap).forEach((id)=> {
                    const subs = subsMap[id];
                    notifySubs(subs, data);
                });
                return $.Deferred().resolve(data).promise();
            }),
            subscribe: sinon.spy((variable, callback)=> {
                // console.log('subscribing', variable);
                const subsid = 'subsid' + (i++);
                const subs = {
                    variables: [].concat(variable),
                    callback: callback,
                };
                subsMap[subsid] = subs;
                notifySubs(subs, knownData);
                return subsid;
            }),
            unsubscribe: sinon.spy((subsid)=> {
                // console.log('unsubscribe', subsid, JSON.stringify(subsMap));
                delete subsMap[subsid];
            })
        };
    };

    return dummyChannel();
}

export function initWithNode(str, domManager, channel) {
    if (!channel) {
        channel = createDummyChannel();
    }
    var $node = $(create(str));

    return domManager.initialize({
        root: $node,
        channel: channel
    });
}

export function spyOnNode($node, spy) {
    if (!spy) {
        spy = sinon.spy();
    }
    $node.on('update.f.ui', function () {
        //sinon doesn't like passing the spy directly with 'this' as context.
        spy.apply(null, arguments);
    });
    return spy;
}
