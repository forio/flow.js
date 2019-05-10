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
            this.$el.off(this.uiChangeEvent).on(this.uiChangeEvent, ()=> {
                const val = this.getUIValue();
                const payload = [{ name: propName, value: val }];
                this.$el.trigger(events.trigger, { data: payload, source: 'bind' });
            });
        }
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, { selector: 'input, select, textarea' });
