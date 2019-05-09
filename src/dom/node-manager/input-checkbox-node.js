import BaseView from './default-input-node';
import config from 'config';

const offAttr = config.attrs.checkboxOffValue;

export default BaseView.extend({
    propertyHandlers: [

    ],

    getUIValue: function () {
        const $el = this.$el;
        const offAttrVal = $el.attr(offAttr);
        const offVal = (offAttrVal && typeof offAttrVal !== 'undefined') ? offAttrVal : false;

        const onAttrVal = $el.attr('value');
        //attr = initial value, prop = current value
        const onVal = (onAttrVal && typeof onAttrVal !== 'undefined') ? $el.prop('value') : true;

        const val = ($el.is(':checked')) ? onVal : offVal;
        return val;
    },
    initialize: function () {
        BaseView.prototype.initialize.apply(this, arguments);
    }
}, { selector: ':checkbox,:radio' });
