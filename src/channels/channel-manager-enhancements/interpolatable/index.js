import subscribeInterpolator from './subscribe-interpolator';
import publishInterpolator from './publish-interpolator';

/**
 * Decorates passed channel manager with interpolation functionality
 * @param  {ChannelManager} ChannelManager
 * @return {ChannelManager}                wrapped channel manager
 */
export default function interpolatable(ChannelManager) {
    var subsidMap = {};

    /**
     * @implements {ChannelManager}
     */
    return class InterpolatedChannelManager extends ChannelManager {
        constructor(options) {
            super(options);
            //FIXME: Add on-error here?
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
            if (existing) {
                super.unsubscribe(existing);
            }
            super.unsubscribe(token);
            delete subsidMap[token];
        }
        unsubscribeAll() {
            subsidMap = {};
            super.unsubscribeAll();
        }
    };
}
