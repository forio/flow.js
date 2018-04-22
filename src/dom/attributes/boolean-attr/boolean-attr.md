---
title: boolean attr
layout: "flow"
isPage: true
---

## Binding for data-f-[boolean]

Flow.js provides special handling for HTML attributes that take Boolean values.

In particular, for most HTML attributes that expect Boolean values, the attribute is directly set to the value of the model variable. This is true for `checked`, `selected`, `async`, `autofocus`, `autoplay`, `controls`, `defer`, `ismap`, `loop`, `disabled`, `hidden`,  `multiple`, `readonly`, `open`, `required`, and `scoped`.

**Example**

     <!-- this checkbox is CHECKED when sampleBool is TRUE,
          and UNCHECKED when sampleBool is FALSE -->
     <input type="checkbox" data-f-checked="sampleBool" />

