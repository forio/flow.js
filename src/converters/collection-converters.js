const _ = require('lodash');

const list = {
    /**
     * Returns all values in array matching argument
     *
     * ** Example **
     * <!-- list online users -->
     * <ul data-f-foreach="users | filter(isOnline)"><li></li></button>
     * 
     * @param  {string|number|boolean} valueToFilterBy value to reject
     * @param  {any[]} source The arrayed model variable
     * @return {any[]}     filtered lsit
     */
    filter: function (valueToFilterBy, source) {
        source = [].concat(source);
        if ($.isPlainObject(source[0])) {
            return _.filter(source, valueToFilterBy);
        }
        return source.filter((v)=> v === valueToFilterBy);
    },

    /**
     * Returns all values in array excluding match
     *
     * ** Example **
     * <!-- list offline users -->
     * <ul data-f-foreach="users | except(isOnline)"><li></li></button>
     * 
     * @param  {string|number|boolean} valueToReject value to reject
     * @param  {any[]} source The arrayed model variable
     * @return {any[]}     filtered lsit
     */
    except: function (valueToReject, source) {
        source = [].concat(source);
        if ($.isPlainObject(source[0])) {
            return _.reject(source, valueToReject);
        }
        return source.filter((v)=> v !== valueToReject);
    },

    /**
     * Checks if array contains *any* item passing the test
     *
     * ** Example **
     * <!-- hides button if any of the users are not online -->
     * <button data-f-hideif="users | any(isOnline) | not">Get Started</button>
     * <button data-f-hideif="users | any({ isOnline: false })">Get Started</button>
     * 
     * @param  {string|object} value value to check for
     * @param  {any[]} source The arrayed model variable
     * @return {boolean}     True if match found in array
     */
    any: function (value, source) {
        source = [].concat(source);
        if ($.isPlainObject(source[0])) {
            return _.some(source, value);
        }
        return source.indexOf(value) !== -1;
    },

    /**
     * Checks if *every* item in the array passes the test
     *
     * ** Example **
     * <!-- shows button if any of the users are not online -->
     * <button data-f-showif="users | every(isOnline)">Get Started</button>
     * 
     * @param  {string|object} value value to check for
     * @param  {any[]} source The arrayed model variable
     * @return {boolean}     True if match found in array
     */
    every: function (value, source) {
        source = [].concat(source);
        if ($.isPlainObject(source[0])) {
            return _.every(source, value);
        }
        return source.filter((v)=> v === value).length === source.length;
    }
};
const converters = Object.keys(list).map((name)=> {
    return {
        alias: name,
        acceptList: true,
        convert: list[name]
    };
});

module.exports = converters;
