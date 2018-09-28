---
title: attribute manager
layout: "flow"
isPage: true
---

## Attribute Manager

Flow.js provides a set of custom DOM attributes that serve as a data binding between variables and operations in your project's model and HTML elements in your project's user interface. Under the hood, Flow.js is doing automatic conversion of these custom attributes, like `data-f-bind`, into HTML specific to the attribute's assigned value, like the current value of `myModelVar`.

If you are looking for examples of using particular attributes, see the [specific attributes subpages](../../../../attributes-overview/).

If you would like to extend Flow.js with your own custom attributes, you can add them to Flow.js using the Attribute Manager.

The Attribute Manager is specific to adding custom attributes and describing their implementation (handlers). (The [Dom Manager](../../) contains the general implementation.)

**Examples**

Built-in attribute handlers like `data-f-value` and `data-f-foreach` automatically bind variables in your project's model to particular HTML elements. However, your UI may sometimes require displaying only part of the variable (e.g. if it's an object), or "doing something" with the value of the variable, rather than simply displaying it.

One example of when custom attribute handlers are useful is when your model variable is a complex object and you want to display the fields in a particular way, or you only want to display some of the fields. While the combination of the [`data-f-foreach` attribute](../loop-attrs/foreach-attr/) and [templating](../../../../#templates) can help with this, sometimes it's easier to write your own attribute handler. (This is especially true if you will be reusing the attribute handler -- you won't have to copy your templating code over and over.)

     Flow.dom.attributes.register('showSched', '*', function (sched) {
           // display all the schedule milestones
           // sched is an object, each element is an array
           // of ['Formal Milestone Name', milestoneMonth, completionPercentage]

           var schedStr = '<ul>';
           var sortedSched = _.sortBy(sched, function(el) { return el[1]; });

           for (var i = 0; i < sortedSched.length; i++) {
                 schedStr += '<li><strong>' + sortedSched[i][0]
                       + '</strong> currently scheduled for <strong>Month '
                       + sortedSched[i][1] + '</strong></li>';
           }
           schedStr += '</ul>';

           this.html(schedStr);
     });

Then, you can use the attribute handler in your HTML just like other Flow.js attributes:

     <div data-f-showSched="schedule"></div>

## Methods

<%= jsdoc %>
