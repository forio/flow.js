'use strict';

var ContextExtractor = require('./context-extractor');

module.exports = function ($container) {
    var template = require('./context-show.html');
    var $html = $(template);

    var promise;
    var extractor;

    if (window.Flow.channel.run.getCurrentConfig) {
        var config = window.Flow.channel.run.getCurrentConfig();
        var modelType = config.model.split('.')[1];
        if (modelType !== 'vmf') {
            config.token = 'eyJhbGciOiJSUzI1NiJ9.eyJqdGkiOiI3YmM5MTI3My0yOGQzLTQyYWUtYTFhMy05YzEwYzg3ZmM0NTMiLCJzdWIiOiIwOTdlOTMzMC1mOWYyLTQ0MTAtYTY3My0wYTQwNzkyZjFkMTgiLCJzY29wZSI6WyJvYXV0aC5hcHByb3ZhbHMiLCJvcGVuaWQiXSwiY2xpZW50X2lkIjoibG9naW4iLCJjaWQiOiJsb2dpbiIsImdyYW50X3R5cGUiOiJwYXNzd29yZCIsInVzZXJfaWQiOiIwOTdlOTMzMC1mOWYyLTQ0MTAtYTY3My0wYTQwNzkyZjFkMTgiLCJ1c2VyX25hbWUiOiJucmFuaml0QGZvcmlvLmNvbSIsImVtYWlsIjoibnJhbmppdEBmb3Jpby5jb20iLCJwYXJlbnRfYWNjb3VudF9pZCI6bnVsbCwiaWF0IjoxNDQ5ODU3ODMwLCJleHAiOjE0NDk5MDEwMzAsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6OTc2My91YWEvb2F1dGgvdG9rZW4iLCJhdWQiOlsib2F1dGgiLCJvcGVuaWQiXX0.iE2FccE3UqWBSmTQxraz0Isyb5w17aki1Q_BY_yM0qvdVLxIPq17oCtY3u8cL2uqLeIqvyvH7WRUvccadbh1fOisPX-V2NyfJg0sV82ti_yy4McDW-7ja8ilwP1QDXzsCOlMs4xyfCnd9KyJ7DiwYbrK2uhMvxV3NtFaH3WbrDLptf128zl3olLHN3XuyB0gvXHnfeitgDh-J79Kl7gC8JkGNK5_q--FddjJFVQz-dTwsPMzGQt-Tro7Hu45ACyn07B4IaFqIggmOtR9cUD7pao_YNzgMetLQ5mMz3ExIasWciqQ8E32S6S6s_Jp_3CpyZdCwlUWumI8yeZTsS9TAg';
            var file = new F.service.File(config);
            promise = file.getFileContents(config.model, 'model').then(function (response) {
                extractor = new ContextExtractor(config.model, response);
                return extractor;
            });
        }
    }

    $container.on('click', '.f-bind, .f-foreach, .f-on', function (evt) {
        var $target = $(evt.target).is('.f-val') ? $(evt.target) : $(evt.target).parent().find('.f-val');
        var variableName = $target.text().trim();
        var isFunction = $target.parent().is('.f-on');
        promise.then(function (extractor) {
            var context = extractor.showContext(variableName, isFunction);
            $html.find('pre').html(context);
        });
    });

    $container.append($html);
};


