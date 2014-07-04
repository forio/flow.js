#Flow.js

flow-dom-listeners.js
flow-core.js
    .bind('Price', domElement)
    .unbind('Price', domElement)
flow-dom-updaters.js

##f-value

f-value is an attribute on your HTML you use to set-up bi-directional binding of the element to your Epicenter model.

e.g.,
<input type="text" f-value="Price"/>
<span f-value="Sales"> </span>

Once your set the f-value Flow.js figures out the appropriate action to take based on the element type, and the data-response from your model.

input[text] - Sets the value

input[radio, checkbox]
<input type="radio" f-value="Cost"/> // Is selected if the variable cost is "truthy"
<input type="radio" f-value="Cost" value="4"/> // Is selected if the variable cost equals 4

select - selects the option with the value attribute matching the model value
textarea - sets the content
all other tags * - sets the contents (or inner html)

* web-components - flow.js recognizes webcomponents and does not attempt to update them.

Have a default HTML element you'd rather handle yourself? Just add an attribute f-noop and flow.js will not attempt to update it. You will get a change event triggered on top of it to handle the update yourself.

##Other attribute bindings

f-value works for values but sometimes you may want to do other things with your model value besides just printing it. For example, you may want to disable a button if a model value isn't set. In such cases, prefix the property you want to bind with "f-" and flow.js will take care of the rest.

Examples
##Bind any property/attribute you want to using the "f-value" prefix.
<input type="text" f-value="Price" value="4" /> Default value will be over-written by value returned from the model

<input type="button" f-disabled="AllowedToAdvance" /> The button will be disabled unless the "AllowedToAdvance" returns a "truthy" value.

<input type="radio" f-checked="HasBeenSelected" f-value="Cost" value="4" /> The checked state of the button will be based on the truthy value of "HasBeenSelected" in the model. When this radio is selected it sets "Cost" to "4". // Weird example, you probably won't do this

The following two sections of the code are equivalent.
<select>
    <option f-selected="Some_Decison" value="1"> 1 </option>
    <option f-selected="Some_Decison" value="2"> 2 </option>
    <option f-selected="Some_Decison" value="3"> 3 </option>
</select>

<select f-value="Some_Decision"> ## Short-hand for the above
    <option value="1"> 1 </option>
    <option value="2"> 2 </option>
    <option value="3"> 3 </option>
</select>

Attribute bindings are especially useful while working with classes, as you can use them to show/hide things, move things around etc

<style type="text/css">
    .pricevariable {
        display: block;
    }
    .pricevariable. { /* Value of toggleVariable1 is 1 */
        display: none;
    }
</style>
<div f-class="toggleVariable1 |" class="pricevariable">

</div>



##Nested variables
use [] syntax for nested variables
<input type="text" f-value="Price[2][1]" />

Interpolate within f-value properties to get values based on others
<input type="text" f-value="Price[<#another_variable>][1]" />


##Formatters

## All values can be piped to formatters. Alternatively define a formatter as a seperate attribute
<input type="text" f-value="Price | $##.00" />
<input type="text" f-value="Price" f-format="$##.00" />

Available formatters:
"dollar", "date"
If you pass in a number format it'll be applied to the value automatically

### Formatters pipe down
<form f-format="$##.00">
    <input type="text" f-value="Price1" value="4">
    <input type="text" f-value="Price2" value="4">
</form>

### Add class names with formatters
<style type="text/css">
    .classname-1 {
        display: none;
    }
    .classname-0 {
        display: block;
    }
</style>
<script type="text/javascript">
    F.flow.formatters.classAdder = function(value) {
        return 'classname-' + value;
    };
</script>
<div f-class="toggleVariable1 | classAdder">

</div>
