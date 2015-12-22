Core
    Support nested for-each loops
    Housekeeping: List all the custom data attributes/ events we're using under a single config
    Allow specifying custom templates
        Use Case: I don't want to use underscore/ it conflicts with my other libraries
    Allow support for async converters
        Use Case: I want to format the value with (say) the current Fed Exchange rate accessed through a different API
    Ability to "interpolate" different inputs sources into operation/variable parameters
        Use Case: I want to do data-f-on-click="operation(<variable>)"
    Allow operations to be interpolated with dom element values
        Use Case: <button data-f-click="calculate(<#input1>, <#input2>)"></button>
        If you're performing operations based on user-inputs you should be able to connect them directly.
    Ability to bind outputs of operations to DOM Elements. Currently all operations are assumed to be one-way.
        <div data-f-oninit="calculate(<#input1>, <#input2>) > result">
            <span data-f-bind="result.value1"> </span>
        </div>

        <ul data-f-oninit="calculate(<#input1>, <#input2>) > result">
            <li data-f-foreach="result[<key>]" > </li>
        </ul>
    Housekeeping: Rethink Node-manager (see if we need it, if we do document use-case)

Channels
    Currently the run is the only "data source" for any bound FlowJS elements. Extend this to (in order of priority):
     - Multiple Runs
     - Data API
     - Dom Inputs
     - Global variables
     - Google Docs
    Allow 'self-updating' channels; i.e., run service should auto-update UI for multiplayer sims based on Cometd
        - Also listen for World/ Data API etc.

    Housekeeping: Set variables channel to false by default
    Housekeeping: Refactor operations channel

Add-ons
    Flow Inspector
        Bug: Make dragging panels smoother
        Bug: Panels don't move when you scroll the page
        Improvment: Re-draw panels if the UI layout changes after the inspector has been loaded
        Add 'model context' view for R models
        Housekeeping: Add test-cases
        Add 'errors' panel to show if the last call failed/ point to external doc with explanations
        Documentation
    UI-utils
        Loading screen
            Use Case: I want to show a loading screen for my application without having to write custom code.
        Highlight Changes
            Use Case: After each operation/ variable set I want to visually see what changed.
    Flow Builder
        Allow editing model equations from within Flow Inspector
        "Live-update" UI as you edit the model equations
        Flow Inspector currently only shows already bound events, allow adding new items to existing DOM elements (and save through File API)
            This would mean _any_ html page can easily be hooked up to Epicenter and potentially alleviate need for UI Builder

Support
    Create basic 'Flow Backbone' view to demonstrate working with Flow and Backbone
    Create basic 'Flow angular' view to demonstrate working with Flow and angular
