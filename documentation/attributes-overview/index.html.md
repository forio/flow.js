---
title: "Flow.js: Variables and Attributes"
layout: "flow"
isPage: true
---

## Flow.js: Variables and Attributes 

### Displaying and Updating Model Variables


You can bind variables from your project's model to your project's user interface by setting the `data-f-bind` attribute of any HTML element. (Flow.js uses the HTML5 convention of prepending `data-` to any custom HTML attribute. Flow.js also adds `f` for easy identification of Flow.js and Forio.)

The `data-f-bind` attribute binding is **bi-directional**, meaning that as the model changes, the interface is automatically updated; and when end users change values in the interface, the model is automatically updated. Specifically:

* The binding from the model to the interface ensures that the current value of the variable is displayed in the HTML element. This includes automatic updates to the displayed value if something else changes in the model. 

* The binding from the interface to the model ensures that if the HTML element is editable, changes are sent to the model.

Once you set `data-f-bind`, Flow.js figures out the appropriate action to take based on the element type and the data response from your model.

#### How do I ... ?

| Action  | Attribute  | More Information |
|-------------|--------------------|-----------|
| Display and automatically update a variable in the interface?                    | `data-f-bind`                          | See [Default Bi-directional Binding](../generated/dom/attributes/binds/default-bind-attr/). |
| Display and automatically update array and object variables?                     | `data-f-foreach`, and optionally, [templates](../#templates)  | See [Display Array and Object Variables](../generated/dom/attributes/foreach/default-foreach-attr/).   |
| Display a DOM element based on whether a variable is true or false?              | `data-f-showif`, `data-f-hideif`       | See [Display Elements Conditionally (showif)](../generated/dom/attributes/toggles/show-if/) and [Display Elements Conditionally (hideif)](../generated/dom/attributes/toggles/hide-if/). |
| Display the value of the variable at every time step (not just the current one)? | `data-f-repeat`   | See [Display Array Variables](../generated/dom/attributes/repeat-attr/).               |
| Display a variable only (read-only binding)?                                     | `data-f-value`, for example            | See [read only binding](../generated/dom/attributes/default-attr/).  |
| Display different information based on the value of a variable?                  | any comparison attribute               | See [Boolean Conditional Converters](../generated/converters/bool-conditional-converter/) and [Number Comparison Converters](../generated/converters/number-compare-converter/).                 |
| Call a model operation each time a variable changes?                             | `data-f-bind` with `Flow.channel.variables.subscribe`         | Bind the variable, use the [Variables Channel](../generated/channels/variables-channel/) to subscribe to the variable, and then call the operation in the callback function for the subscription. See details in the [How To example](../../how_to/variable_operation/).  |
| Select an option from an HTML element based on a model variable?                 | `data-f-bind` with `input` or `select` | This happens automatically when you use `data-f-bind` with `input` and `select` elements. See more on [binding to select elements](../generated/dom/attributes/binds/input-bind-attr/) and [binding with checkboxes and radio buttons](../generated/dom/attributes/binds/checkbox-radio-bind-attr/).  |
| Work with an HTML attribute that accepts Boolean values?                         | Special handling is provided for a few common attributes, including `data-f-checked`, `data-f-selected`, `data-f-disabled`, and `data-f-hidden`.   | See [Binding to Boolean attributes](../generated/dom/attributes/boolean-attr/).   |
| Change the styling of HTML elements based on the value of a model variable?      | `data-f-class`   | See [Binding with Style](../generated/dom/attributes/class-attr/).  |
| Set other HTML attributes to the value of a model variable?                      | `data-f-<attribute>`       | See [default attribute handling](../generated/dom/attributes/default-attr/).                  |
| Create my own custom attribute?                                                  | `data-f-<customAttribute>`     | Use the [Attribute Manager](../generated/dom/attributes/attribute-manager/) to add your own attributes.   |

