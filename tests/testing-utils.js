'use strict';
module.exports = {
    create: function(str) {
        var div = document.createElement('div');
        div.innerHTML = str;
        return div.childNodes[0];
    }
};
