export default (function () {
    function defineProperties(target, props) {
        Object.keys(props).forEach(function (key) {
            var descriptor = {};
            descriptor.key = key;
            descriptor.value = props[key];
            descriptor.enumerable = false;
            descriptor.writable = true;
            descriptor.configurable = true;
            Object.defineProperty(target, key, descriptor); 
        });
    }
    return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps);
        return Constructor; 
    }; 
}());
