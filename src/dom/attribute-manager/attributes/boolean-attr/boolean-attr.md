## Binding for data-f-[boolean]

Flow.js provides special handling for HTML attributes that take Boolean values.

In particular, for most HTML attributes that expect Boolean values, the attribute is directly set to the value of the model variable. This is true for `checked`, `selected`, `async`, `autofocus`, `autoplay`, `controls`, `defer`, `ismap`, `loop`, `disabled`, `hidden`,  `multiple`, `readonly`, `open`, `required`, and `scoped`.

**Example**

```html
<!-- this checkbox is CHECKED when allowSelection is TRUE,
    and UNCHECKED when allowSelection is FALSE -->
<input type="checkbox" data-f-checked="allowSelection" />
```
