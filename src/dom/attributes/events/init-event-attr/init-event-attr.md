---
title: init event attr
layout: "flow"
isPage: true
---

<!-- module desc -->

## Call Operation when Element Added to DOM

Many models call an initialization operation when the [run](../../../../../../glossary/#run) is first created. This is particularly common with [Vensim](../../../../../../model_code/vensim/) models, which need to initialize variables ('startGame') before stepping. You can use the `data-f-on-init` attribute to call an operation from the model when a particular element is added to the DOM.

#### data-f-on-init

Add the attribute `data-f-on-init`, and set the value to the name of the operation. To call multiple operations, use the `|` (pipe) character to chain operations. Operations are called serially, in the order listed. Typically you add this attribute to the `<body>` element.

**Example**

     <body data-f-on-init="startGame">

     <body data-f-on-init="startGame | step(3)">

