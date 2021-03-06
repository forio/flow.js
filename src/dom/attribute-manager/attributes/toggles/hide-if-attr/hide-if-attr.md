## hideif

The `data-f-hideif` attribute allows you to hide DOM elements based on either the value of the model variable (true or false), or the value of a [comparison (Number Comparison Converter)](../../../../converters/number-compare-converter/) using a model variable.

**Examples:**
```html
<!-- model variable already has a boolean value -->
<div data-f-hideif="sampleBooleanModelVariable">Remains hidden if the model variable is true</div>

<!-- chain with the greaterThan converter to produce a boolean value, 
    text is hidden when widgets is greater than 10 -->
<div data-f-hideif="widgets | greaterThan(10)"/>Get to work, we need to sell more widgets!</div>
```

**Notes:**
* By default, the DOM element to which you add the `data-f-hideif` attribute is *not* displayed.
* You can chain model variable(s) together with any number of converters. The result of the conversion must be boolean.
