
<label> Hello </label>
<input type="text" data-f-value="Price" value="4">
<input type="radio" data-f-checked="Decision Value" data-f-value="Cost">

<input type="text" data-f-value="Price | $##.00" value="4">
<input type="text" data-f-value="Price" data-f-format="$##.00" value="4">


<form data-f-format="$##.00">
    <input type="text" data-f-value="Price1" value="4">
    <input type="text" data-f-value="Price2" value="4">
</form>

<div data-f-class="toggle1">

</div>
<div data-f-class="toggle1 | classAdder">

</div>


- Need to identify where the value is coming from
    Model (Run)
    Model (Operation)
    Data API
        Ignore because you can store everything in the run object

- Can pipe values to filters

    F.decisionize.formatters.upperCase = function () {}

