'use strict';
(function () {
    var s = document.createElement('link');
    s.setAttribute('href', '<%= cdnBasePath %>/<%= version %>/flow-inspector.css');
    s.setAttribute('rel','stylesheet');
    s.setAttribute('type','text/css');
    document.getElementsByTagName('head')[0].appendChild(s);

    var jsCode = document.createElement('script');
    jsCode.setAttribute('src', '<%= cdnBasePath %>/<%= version %>/flow-inspector-min.js');
    document.body.appendChild(jsCode);

    new window.Flow.Inspector('body');
 }());
