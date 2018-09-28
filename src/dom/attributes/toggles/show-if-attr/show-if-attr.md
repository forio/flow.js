---
title: showif attr
layout: "flow"
isPage: true
---

## Display Elements Conditionally (showif)

The `data-f-showif` attribute allows you to display DOM elements based on either the value of the model variable (true or false), or the value of a [comparison (Number Comparison Converter)](../../../../converters/number-compare-converter/) using a model variable.

**Examples:**
     <!-- model variable already has a boolean value -->
     <div data-f-showif="sampleBooleanModelVariable">Only appears if the model variable is true</div>

     <!-- chain with the greaterThan converter to produce a boolean value,
         text is shown when widgets is greater than 50 -->
     <div data-f-showif="widgets | greaterThan(50)"/>Nice job, we've sold plenty of widgets!</div>

**Notes:**
* By default, the DOM element to which you add the `data-f-showif` attribute is *not* displayed.
* You can chain model variable(s) together with any number of converters. The result of the conversion must be boolean.
