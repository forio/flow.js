//UI Builder - Flow integration file. TODO: Move this to the UI Builder project
$(function () {
    'use strict';
    if ($('body').data('mode') !== 'builder') {
        Flow.initialize({
            channel: {
                run: {
                    variables: {
                        silent: true
                    }
                },
                transport: {
                    beforeSend: function () {
                        $('body').addClass('loading');
                    },
                    complete: function () {
                        $('body').removeClass('loading');
                    }
                }
            }
        });
    }
});
