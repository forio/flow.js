"use strict";
var __cov_1KhFWVtYGTHh4NxIBeG83w = (Function('return this'))();
if (!__cov_1KhFWVtYGTHh4NxIBeG83w.__coverage__) { __cov_1KhFWVtYGTHh4NxIBeG83w.__coverage__ = {}; }
__cov_1KhFWVtYGTHh4NxIBeG83w = __cov_1KhFWVtYGTHh4NxIBeG83w.__coverage__;
if (!(__cov_1KhFWVtYGTHh4NxIBeG83w['/Users/jzhang/Documents/libraries/flow.js/src/dom/attributes/events/default-event-attr.js'])) {
   __cov_1KhFWVtYGTHh4NxIBeG83w['/Users/jzhang/Documents/libraries/flow.js/src/dom/attributes/events/default-event-attr.js'] = {"path":"/Users/jzhang/Documents/libraries/flow.js/src/dom/attributes/events/default-event-attr.js","s":{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"13":0},"b":{"1":[0,0]},"f":{"1":0,"2":0,"3":0,"4":0},"fnMap":{"1":{"name":"(anonymous_1)","line":7,"loc":{"start":{"line":7,"column":10},"end":{"line":7,"column":33}}},"2":{"name":"(anonymous_2)","line":11,"loc":{"start":{"line":11,"column":10},"end":{"line":11,"column":33}}},"3":{"name":"(anonymous_3)","line":14,"loc":{"start":{"line":14,"column":32},"end":{"line":14,"column":44}}},"4":{"name":"(anonymous_4)","line":16,"loc":{"start":{"line":16,"column":52},"end":{"line":16,"column":69}}}},"statementMap":{"1":{"start":{"line":3,"column":0},"end":{"line":27,"column":2}},"2":{"start":{"line":8,"column":8},"end":{"line":8,"column":43}},"3":{"start":{"line":12,"column":8},"end":{"line":12,"column":39}},"4":{"start":{"line":13,"column":8},"end":{"line":13,"column":22}},"5":{"start":{"line":14,"column":8},"end":{"line":24,"column":11}},"6":{"start":{"line":15,"column":12},"end":{"line":15,"column":70}},"7":{"start":{"line":16,"column":12},"end":{"line":21,"column":15}},"8":{"start":{"line":17,"column":16},"end":{"line":17,"column":49}},"9":{"start":{"line":18,"column":16},"end":{"line":18,"column":89}},"10":{"start":{"line":19,"column":16},"end":{"line":19,"column":76}},"11":{"start":{"line":20,"column":16},"end":{"line":20,"column":54}},"12":{"start":{"line":23,"column":12},"end":{"line":23,"column":87}},"13":{"start":{"line":25,"column":8},"end":{"line":25,"column":21}}},"branchMap":{"1":{"line":19,"type":"cond-expr","locations":[{"start":{"line":19,"column":53},"end":{"line":19,"column":70}},{"start":{"line":19,"column":73},"end":{"line":19,"column":75}}]}}};
}
__cov_1KhFWVtYGTHh4NxIBeG83w = __cov_1KhFWVtYGTHh4NxIBeG83w['/Users/jzhang/Documents/libraries/flow.js/src/dom/attributes/events/default-event-attr.js'];
__cov_1KhFWVtYGTHh4NxIBeG83w.s['1']++;module.exports={target:'*',test:function(attr,$node){__cov_1KhFWVtYGTHh4NxIBeG83w.f['1']++;__cov_1KhFWVtYGTHh4NxIBeG83w.s['2']++;return attr.indexOf('on-')===0;},init:function(attr,value){__cov_1KhFWVtYGTHh4NxIBeG83w.f['2']++;__cov_1KhFWVtYGTHh4NxIBeG83w.s['3']++;attr=attr.replace('on-','');__cov_1KhFWVtYGTHh4NxIBeG83w.s['4']++;var me=this;__cov_1KhFWVtYGTHh4NxIBeG83w.s['5']++;this.off(attr).on(attr,function(){__cov_1KhFWVtYGTHh4NxIBeG83w.f['3']++;__cov_1KhFWVtYGTHh4NxIBeG83w.s['6']++;var listOfOperations=_.invoke(value.split('|'),'trim');__cov_1KhFWVtYGTHh4NxIBeG83w.s['7']++;listOfOperations=listOfOperations.map(function(value){__cov_1KhFWVtYGTHh4NxIBeG83w.f['4']++;__cov_1KhFWVtYGTHh4NxIBeG83w.s['8']++;var fnName=value.split('(')[0];__cov_1KhFWVtYGTHh4NxIBeG83w.s['9']++;var params=value.substring(value.indexOf('(')+1,value.indexOf(')'));__cov_1KhFWVtYGTHh4NxIBeG83w.s['10']++;var args=$.trim(params)!==''?(__cov_1KhFWVtYGTHh4NxIBeG83w.b['1'][0]++,params.split(',')):(__cov_1KhFWVtYGTHh4NxIBeG83w.b['1'][1]++,[]);__cov_1KhFWVtYGTHh4NxIBeG83w.s['11']++;return{name:fnName,params:args};});__cov_1KhFWVtYGTHh4NxIBeG83w.s['12']++;me.trigger('f.ui.operate',{operations:listOfOperations,serial:true});});__cov_1KhFWVtYGTHh4NxIBeG83w.s['13']++;return false;}};
