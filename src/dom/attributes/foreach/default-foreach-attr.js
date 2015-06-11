/**
 * ## Display Array and Object Variables: data-f-foreach
 *
 * Special handling for model variables that are arrays.
 *
 * TODO-should this be the http://qa.forio.com/epicenter/docs/public/data_binding_flow_js/#display_foreach ? or ... ?
 *
 * If your model variable is an array, you can reference specific elements of the array using data-f-bind: data-f-bind="sales[3]" or data-f-bind="sales[<currentRegion>]", as described under [data-f-bind](../../binds/default-bind-attr/).
 *
 * ####data-f-bind
 *
 * Select the checkbox or radio button if the `value` matches the value of the model variable referenced, or if the model variable is true.
 *
 * **Example**
 *
 *      <!-- radio button, selected if sampleInt is 8 -->
 *      <input type="radio" data-f-bind="sampleInt" value="8" />
 *
 *      <!-- checkbox, checked if sampleBool is true -->
 *      <input type="checkbox" data-f-bind="sampleBool" />
 *
 * ####data-f-checked
 *
 * If the model variable is boolean, optionally, use the special property `checked` to make the selection instead.
 *
 * **Example**
 *
 *      <!-- checkbox, checked if sampleBool is true -->
 *      <input type="checkbox" data-f-checked="sampleBool" />
 * 
 */

'use strict';
var parseUtils = require('../../../utils/parse-utils');
module.exports = {

    test: 'foreach',

    target: '*',

    handle: function (value, prop) {
        value = ($.isPlainObject(value) ? value : [].concat(value));
        var $loopTemplate = this.data('foreach-template');
        if (!$loopTemplate) {
            $loopTemplate = this.children();
            this.data('foreach-template', $loopTemplate);
        }
        var $me = this.empty();
        _.each(value, function (dataval, datakey) {
            dataval = dataval + '';
            var nodes = $loopTemplate.clone();
            nodes.each(function (i, newNode) {
                newNode = $(newNode);
                _.each(newNode.data(), function (val, key) {
                    var templated =  _.template(val, { value: dataval, index: datakey, key: datakey });
                    newNode.data(key, parseUtils.toImplicitType(templated));
                });
                var oldHTML = newNode.html();
                var cleanedHTML = oldHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                var templated = _.template(cleanedHTML, { value: dataval, key: datakey, index: datakey });
                if (cleanedHTML === templated) {
                    newNode.html(dataval);
                } else {
                    newNode.html(templated);
                }
                $me.append(newNode);
            });
        });
    }
};
