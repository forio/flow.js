---
title: default event attr
layout: "flow"
isPage: true
---

## Call Operation in Response to User Action

Many models call particular operations in response to end user actions, such as clicking a button or submitting a form.

#### data-f-on-event

For any HTML attribute using `on` -- typically on click or on submit -- you can add the attribute `data-f-on-XXX`, and set the value to the name of the operation. To call multiple operations, use the `|` (pipe) character to chain operations. Operations are called serially, in the order listed.

All JQuery event types are supported.

**Example**
```html
<button data-f-on-click="reset">Reset</button>
<button data-f-on-click="step(1)">Advance One Step</button>
```
