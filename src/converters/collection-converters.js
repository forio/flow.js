const _ = require('lodash');

const list = {
    except: function (valueToReject, val) {
        return _.reject([].concat(val), valueToReject);
    },
    filter: function (value, val) {
        return _.filter([].concat(val), value);
    },
    /**
     * Checks if array contains *any* truthy value
     *
     * ** Example **
     * <button data-f-disabled="users | any(isOnline) | not">Get Started</button>
     * <button data-f-disabled="users | any({ isOnline: false })">Get Started</button>
     * 
     * @param  {string|object} value value to check for
     * @param  {object[]} source The arrayed model variable
     * @return {boolean}     True if match found in array
     */
    any: function (value, source) {
        return _.some([].concat(source), value);
    },
    every: function (value, source) {
        return _.every([].concat(source), value);
    },
    find: function (value, source) {
        return _.find([].concat(source), value);
    },
};
const converters = Object.values(list).map((name)=> {
    return {
        alias: name,
        acceptList: true,
        convert: list[name]
    };
});

module.exports = converters;
