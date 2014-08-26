$(function() {
    'use strict';
    if ($('body').data('mode') !== 'builder') {
        Flow.initialize({
            channel: {
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
