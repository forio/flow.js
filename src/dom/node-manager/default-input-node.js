import { binderAttr, events } from '../../config';
import BaseView from './default-node';

export default BaseView.extend({
    propertyHandlers: [],

    uiChangeEvent: 'change.f-node-event',
    getUIValue: function () {
        return this.$el.val();
    },

    removeEvents: function () {
        this.$el.off(this.uiChangeEvent);
    },

    initialize: function (options) {
        const propName = this.$el.data(binderAttr);
        if (options && options.triggerChangeOn) {
            this.uiChangeEvent = options.triggerChangeOn;
        }
        if (propName) {
            const changeHandler = function () {
                const val = this.getUIValue();
                const payload = [{ name: propName, value: val }];
                if (val.length === 0) {
                    return this.$el.trigger(events.trigger, { data: payload, source: 'bind', restoreOriginal: true });
                }
                this.$el.trigger(events.trigger, { data: payload, source: 'bind' });
            }.bind(this);

            const debouncedHandler = _.debounce(changeHandler, 200);
            const handler = this.uiChangeEvent.indexOf('key') !== -1 ? debouncedHandler : changeHandler;
            this.$el.off(this.uiChangeEvent).on(this.uiChangeEvent, handler);
        }
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, { selector: 'input, select, textarea' });
