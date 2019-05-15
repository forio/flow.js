## Flow.js: Attributes 

### Displaying and Updating data

You can "bind" variables from, say,  your project's model to your project's user interface by setting the `data-f-bind` attribute of any HTML element. (Flow.js uses the HTML5 convention of prepending `data-` to any custom HTML attribute. Flow.js also adds `f` for easy identification of Flow.js and Forio.)

The `data-f-bind` attribute binding is **bi-directional**, meaning that as your model changes, the interface is automatically updated; and when end users change values in the interface, the model is automatically updated. Specifically:

* The binding from the model to the interface ensures that the current value of the variable is displayed in the HTML element. This includes automatic updates to the displayed value if something else changes in the model. 
* The binding from the interface to the model ensures that if the HTML element is editable, changes are sent to the model.

Once you set `data-f-bind`, Flow.js figures out the appropriate action to take based on the element type and the data response from your model.