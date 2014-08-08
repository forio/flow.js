'use strict';
module.exports = {
    alias: 'titleCase',
    convert: function (str) {
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }
};
