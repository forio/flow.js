import { binderAttr, events } from '../../config';
import BaseView from './default-node';

export default BaseView.extend({
    propertyHandlers: [],

    uiChangeEvent: 'change',
    getUIValue: function () {
        return this.$el.val();
    },

    removeEvents: function () {
        this.$el.off(this.uiChangeEvent);
    },

    initialize: function () {
        const me = this;
        const propName = this.$el.data(binderAttr);

        if (propName) {
            this.$el.off(this.uiChangeEvent).on(this.uiChangeEvent, function () {
                const val = me.getUIValue();
                const payload = [{ name: propName, value: val }];
                me.$el.trigger(events.trigger, { data: payload, source: 'bind' });
            });
        }
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, { selector: 'input, select, textarea' });
