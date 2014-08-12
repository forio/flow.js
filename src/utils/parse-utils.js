'use strict';

module.exports = {

    toImplicitType: function (data) {
        var rbrace = /^(?:\{.*\}|\[.*\])$/;
        var converted = data;
        if ( typeof data === 'string' ) {
            converted = data === 'true' ? true :
            converted === 'false' ? false :
            converted === 'null' ? null :
            $.isNumeric( data ) ? +data :
                rbrace.test( data ) ? $.parseJSON( data ) :
                data;
        }
        return converted;
    }
};
