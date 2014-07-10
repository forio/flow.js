// (function() {
//     'use strict';
//     var itg = require('../../src/generators/input-text.js');

//     describe('I', function () {
//         // var txt;
//         // before(function() {
//         //     txt = document.createElement('input');
//         //     txt.type = 'text';
//         // });

//         it('Claims text boxes as it/`s own', function () {
//             console.log('ere');
//             var cl = true;
//             sdf.should.be.false;
//         });
//         // it('Does not claim other inputs', function () {
//         //     var rdo = document.createElement('input');
//         //     rdo.type = 'radio';
//         //     itg.claim(rdo).should.equal(true);
//         // });
//     });
// }());



(function() {
    'use strict';

    describe('Input Generator', function () {
        var itg;

        before(function () {
            itg = require('../../src/generators/input-text.js');
        });

        after(function () {
        });

        describe('#claim', function () {
            it('should claim text boxes', function() {
               console.log('ere');
               var cl = true;
               cl.should.be.false;
            });
        });

    });
}());
