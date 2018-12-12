import { isFunction } from 'lodash';

/**
 * @param {any} val 
 * @returns {Promise}
 */
export function makePromise(val) {
    //Can be replaced with Promise.resolve when we drop IE11;
    // if (isFunction(val)) {
    //     return Promise.resolve(val());
    // }
    // return Promise.resolve(val);
    if (val && val.then) {
        return val;
    }
    const $def = $.Deferred();
    if (isFunction(val)) {
        try {
            const toReturn = val();
            if (toReturn && toReturn.then) {
                return toReturn.then((r)=> $def.resolve(r), ((e)=> $def.reject(e)));
            }
            $def.resolve(toReturn);
        } catch (e) {
            $def.reject(e);
        }
    } else {
        $def.resolve(val);
    }
    return $def.promise();
}

/**
 * 
 * @param {function(*)} fn 
 * @returns {function(...any): Promise}
 */
export function promisify(fn) {
    if (!isFunction(fn)) {
        throw new Error(`Promisify requires a function, received ${typeof fn}`);
    }
    /**
     * @param {...*} args 
     * @returns {Promise}
     */
    return function promisifiedFunction(args) {
        const $def = $.Deferred();
        try {
            const toReturn = fn.apply(fn, arguments);
            if (toReturn && toReturn.then) {
                return toReturn.then((r)=> $def.resolve(r), ((e)=> $def.reject(e)));
            }
            $def.resolve(toReturn);
        } catch (e) {
            $def.reject(e);
        }
        return $def.promise();
    };
}
