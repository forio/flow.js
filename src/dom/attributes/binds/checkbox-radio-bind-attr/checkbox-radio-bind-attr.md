---
title: checkbox radio bind attr
layout: "flow"
isPage: true
---

## Checkboxes and Radio Buttons

In the [default case](../default-bind-attr/), the `data-f-bind` attribute creates a bi-directional binding between the DOM element and the model variable. This binding is **bi-directional**, meaning that as the model changes, the interface is automatically updated; and when end users change values in the interface, the model is automatically updated.

Flow.js provides special handling for DOM elements with `type="checkbox"` and `type="radio"`.

In particular, if you add the `data-f-bind` attribute to an `input` with `type="checkbox"` and `type="radio"`, the checkbox or radio button is automatically selected if the `value` matches the value of the model variable referenced, or if the model variable is `true`.

**Example**

     <!-- radio button, selected if sampleInt is 8 -->
     <input type="radio" data-f-bind="sampleInt" value="8" />

     <!-- checkbox, checked if sampleBool is true -->
     <input type="checkbox" data-f-bind="sampleBool" />

