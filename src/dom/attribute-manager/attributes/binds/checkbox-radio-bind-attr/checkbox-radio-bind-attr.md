## Checkboxes and Radio Buttons

In the [default case](../default-bind-attr/), the `data-f-bind` attribute creates a bi-directional binding between the DOM element and the model variable. This binding is **bi-directional**, meaning that as the model changes, the interface is automatically updated; and when end users change values in the interface, the model is automatically updated.

Flow.js provides special handling for DOM elements with `type="checkbox"` and `type="radio"`.

In particular, if you add the `data-f-bind` attribute to an `input` with `type="checkbox"` and `type="radio"`, the checkbox or radio button is automatically selected if the `value` matches the value of the model variable referenced, or if the model variable is `true`.

For checkboxes you can control the 'checked' and 'unchecked' values by setting the `value` (for checked) or `data-off-value` (for unchecked) states.

**Example**

```html
<!-- radio button, selected if currentSelection is 8 -->
<input type="radio" data-f-bind="currentSelection" value="8" />

<!-- checkbox, checked if enableDecision is true -->
<input type="checkbox" data-f-bind="enableDecision" />

<!-- If checked sets 'currentSelection' to 8 -->
<input type="checkbox" data-f-bind="currentSelection" value="8 />

<!-- If unchecked sets 'currentSelection' to 8 -->
<input type="checkbox" data-f-bind="currentSelection" data-off-value="8 />
```
