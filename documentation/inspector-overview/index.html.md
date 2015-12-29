---
title: "Flow Inspector: Debugging with Flow.js"
layout: "flow"
isPage: true
---

##Flow Inspector: Debugging with Flow.js


Flow Inspector is an add-on component of Flow.js that allows you to easily determine which model variables are being used where and in which Flow.js (`data-f-`) attributes in your user interface. 

It's a great way to help you understand the connection between your UI and your model. It can also help to debug problems in your UI, whether you're a front-end developer or a modeler.

<table>
<tr><td>
	<img src="../../img/flow_inspector.png" width="445" height="325" alt="Flow Inspector for Simple UI and Model">
</td></tr>
</table>
<br>

Read more about:

* [Enabling Flow Inspector](#enable)
* [Features of Flow Inspector](#features)


<a name="enable"></a>
####Enabling Flow Inspector

There are two ways to enable Flow Inspector. You can add it to specific pages (always enabled). Or, you can add it to your browser as a bookmark, and turn it on for a specific page by clicking the bookmark link while you are visiting that page.

**To add Flow Inspector to a specific page:**

1. Make sure you're using the latest version of Flow.js: TODO-ASKNAREN
2. Add the Flow Inspector stylesheet to your page:
	
		<link rel="stylesheet" href="https://forio.com/tools/js-libs/flow/next/add-ons/flow-inspector.css">
	
3. Add the Flow Inspector source to your page:

		<script src="https://forio.com/tools/js-libs/flow/next/add-ons/flow-inspector.min.js"></script>

4. Add Flow Inspector to the body of your HTML, by placing a call in the script of your page, anytime after your call to initialize Flow:

		Flow.initialize(...);
		new window.Flow.Inspector('body');

	This causes Flow Inspector to appear every time you load this page of your project.

**To use Flow Inspector on-demand on any page:**

Click and drag the bookmarklet to your bookmarks or favorites bar.

<a class="bookmarklet" href="javascript:!function(){if(!window.Flow)return void window.alert('FlowJS not found on page');var a=document.createElement('link');a.setAttribute('href','//forio.com/tools/js-libs/flow/next/add-ons/flow-inspector.css'),a.setAttribute('rel','stylesheet'),a.setAttribute('type','text/css'),document.getElementsByTagName('head')[0].appendChild(a);var b=function(){new window.Flow.Inspector('body')},c=document.createElement('script');c.setAttribute('src','//forio.com/tools/js-libs/flow/next/add-ons/flow-inspector.min.js'),c.onload=function(){c.onloadDone=!0,b()},c.onReadystatechange=function(){'loaded'!==c.readyState||c.onloadDone||(c.onloadDone=!0,b())},document.body.appendChild(c)}();" alt="Flow Inspector" title="Flow Inspector" draggable="true" style="cursor:move;"><img src="../../img/bookmark.png" class="img-responsive" alt="Flow Inspector" height="60" width="60"/></a>


Now Flow Inspector will appear every time you click this bookmark. For example, go to a page in your project, where your user interface is created using Flow.js. Then, click the Flow Inspector bookmark from your Bookmarks Bar to make the Flow Inspector appear. 

Flow Inspector goes away when you reload the page, but you can re-enable it by clicking the link from your Bookmarks Bar again.

(If your browser doesn't support clicking and dragging the bookmarklet, it's likely that [your browser doesn't support Flow.js anyway](../). However, you can create a bookmark manually by setting the URL to the URL in the <a href="https://github.com/forio/flow.js/blob/master/dist/add-ons/readme.md" target="_blank">Flow Inspector Read Me file on Github</a>.)
 
<a name="features"></a>
####Features of Flow Inspector

Once you've enabled Flow Inspector for a page in your project, you see two windows appear. You can drag each window, independently, as needed.

#####Legend Window

The Legend window displays a legend of different kinds of Flow.js attributes. You can choose to show all kinds of attributes (default) or  use the checkboxes to show only those you need.

<table>
<tr><td>
	<img src="../../img/flow_inspector_legend.png" width="300" height="224" alt="Flow Inspector Legend Window">
</td></tr>
</table>
<br>


* The Bind Output highlights read-only elements (e.g. `<span>`) using the `data-f-bind` attribute. ([Learn more](../generated/dom/attributes/binds/default-bind-attr/).)
* The Loop Output highlights elements using the `data-f-foreach` and `data-f-repeat` elements. ([Learn](../generated/dom/attributes/foreach/default-foreach-attr/) [more](../generated/dom/attributes/repeat-attr/).)
* The Custom Output highlights elements using [custom attributes](../generated/dom/attributes/attribute-manager/).
* The Bind Input highlights read-write elements (e.g. `<input>`) using the `data-f-bind` attribute. ([Learn more](../generated/dom/attributes/binds/default-bind-attr/).)
* The Event Input highlights elements that call operations, such as `data-f-on-click`. ([Learn more](../operations-overview/).)

For each highlighted element,

* A narrow, dark band shows the type of input or output attribute being used.
* A medium band shows the name of the model variable or model operation bound to the element.
* A narrow, light band shows the [converters](../converter-overview/), if any, being applied to this model variable.

Mousing over the Inspector for the element displays the full contents of all three bands.

<table>
<tr><td>Highlighted element<td>
	<img src="../../img/flow_inspector_detail.png" width="53" height="28" alt="Highlighted Element">
</td></tr>
<tr><td>Highlighted element with mouse over<td>
	<img src="../../img/flow_inspector_mouseover.png" width="133" height="28" alt="Highlighted Element with Mouse Over">
</td></tr>
</table>
<br>


#####Context Window

The Context Window of Flow Inspector provides additional data on model variables and model operations. These data appear when you click a Flow Inspector element.

* For model variables, the Context Window provides the variable definition. 

* For model operations, the Context Window provides the operation definition.

<table>
<tr><td>
	<img src="../../img/flow_inspector_operation.png" width="465" height="146" alt="Flow Inspector Context Window with Operation">
</td></tr>
</table>
<br>

The Context Window currently only provides data for [Python](../../model_code/python/) and [Julia](../../model_code/julia/) models. However, support for [additional modeling languages](../../writing_your_model/) is expected, and the window itself appears regardless of modeling language. 

