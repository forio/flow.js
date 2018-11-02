## Flow.js Initialization

To use Flow.js in your project, simply call `Flow.initialize()` in your user interface. In the basic case, `Flow.initialize()` can be called without any arguments. While Flow.js needs to know the account, project, and model you are using, by default these values are extracted from the URL of Epicenter project and by the use of `data-f-model` in your `<body>` tag. See more on the [basics of using Flow.js in your project.](../../#using_in_project).

However, sometimes you want to be explicit in your initialization call, and there are also some additional parameters that let you customize your use of Flow.js.

#### Parameters

<%= JSDOC %>

#### Example
```js
Flow.initialize({
    channel: {
        strategy: 'new-if-persisted',
        run: {
            model: 'supply-chain-game.py',
            account: 'acme-simulations',
            project: 'supply-chain-game',
            server: { host: 'api.forio.com' },
            variables: { silent: ['price', 'sales'] },
            operations: { silent: false },
            transport: {
                beforeSend: function() { $('body').addClass('loading'); },
                complete: function() { $('body').removeClass('loading'); }
            }
        }
    }
}).then(function() {
    // code that depends on initialization
});
```js

