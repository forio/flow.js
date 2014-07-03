- Need to identify where the value is coming from
    Model (Run)
    Model (Operation)
    Data API
        Ignore because you can store everything in the run object

- Can pipe values to filters

    F.flow.formatters.upperCase = function () {}




Generator:
    - Attaches itself to DOM elements with the right attributes
    - On change figures out the right model variable name and value
    - Passes on model variable name and value
        ? trigger an update event on itself?
        ? call attached channel instance with this?
        ? Save to run api directly?

    ^
    |
Channel


    Triggers model.change with old value, new value

    |
    v

Updater:
    - Catches model.change events on DOM elements. Model.change will be triggered with variable name, value
    - Update yourself with the right value

