import subscribeInterpolator from './subscribe-interpolator';
import publishInterpolator from './publish-interpolator';

export default function interpolatable(ChannelManager) {
    var subsidMap = {};

    return class InterpolatedChannelManager extends ChannelManager {
        constructor(options) {
            super(options);
            this.subscribe = subscribeInterpolator(this.subscribe.bind(this), (dependencySubsId, newDependentId)=> {
                var existing = subsidMap[dependencySubsId];
                if (existing) {
                    this.unsubscribe(existing);
                }
                subsidMap[dependencySubsId] = newDependentId;
            });

            this.publish = publishInterpolator(this.publish.bind(this), (variables, cb)=> {
                super.subscribe(variables, (response, meta)=> {
                    this.unsubscribe(meta.id);
                    cb(response);
                }, { autoFetch: true, batch: true });
            });
        }
        unsubscribe(token) {
            var existing = subsidMap[token];
            var toDelete = existing || token;
            super.unsubscribe(toDelete);
            delete subsidMap[token];
        }
        unsubscribeAll() {
            subsidMap = {};
            super.unsubscribeAll();
        }
    };
}
