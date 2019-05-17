## Display Array and Object Variables: data-f-foreach

If your model variable is an array, you can reference specific elements of the array using `data-f-bind`: `data-f-bind="sales[3]"` or `data-f-bind="sales[<currentRegion>]"`, as described under [data-f-bind](../../binds/default-bind-attr/).

However, sometimes you want to loop over *all* of the children of the referenced variable. The loop attributes allow you to automatically loop over all the 'children' of a referenced variable &mdash; that is, all the elements of an array, or all the fields of an object.
