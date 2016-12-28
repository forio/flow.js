module.exports = function (path, toPublish) {
    var split = path.split(':');
    var handlers = [
        {
            match: 'scenario:',
            handle: scenarioHandler,
        },
        {
            match: 'run:',
            isDefault: true,
            handle: runHandler,
        },
    ];

    var outerPath = split.shift();
    var matchFound = false;
    handlers.forEach(function (handler) {
        if (outerPath === handler.match) {
            handler.handle(split.join(':'), toPublish);
            matchFound = true;
        }
    });
    if (!matchFound) {
        var defaultHandler = handlers.find(function (h) {
            return h.isDefault;
        });
        defaultHandler.handle(path, toPublish);
    }


    var scenarioHandlers = [
        {
            match: 'baseline:',
            handle: baselineHandler,
        },
        {
            match: 'currentRun:',
            isDefault: true,
            handle: runHandler,
        },
    ];

    var runHandlers = [
        {
            match: 'current',
            isDefault: true,
            handle: currentRunHandler
        },
        {
            match: '*', //runidregex
            handle: RunService
        }
    ];

    var runHandlers = [
        {
            match: 'variables',
            isDefault: true,
            handle: currentRunHandler
        },
        {
            match: 'operations', //runidregex
            handle: RunService
        }
    ];
    // Flow.subscribe('scenario: baseline: variables');
    // Flow.subscribe('scenario: currentRun: variables');
    // Flow.subscribe('scenario: savedRuns');
    //     //only allowed operations are `add` and `remove`

    // Flow.subscribe('run:current:variables');
    // Flow.subscribe('run: <runid>:variables');
    // if runid not provided default to 'currentrun'
    
};
