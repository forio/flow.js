const cm = require('src/converters/converter-manager.js');

describe('String converter', ()=> {
    describe('upperCase', ()=> {
        it('should convert strings to upper case', ()=> {
            cm.convert('abc', 'upperCase').should.equal('ABC');
        });
    });
    describe('lowerCase', ()=> {
        it('should convert strings to upper case', ()=> {
            cm.convert('ABC', 'lowerCase').should.equal('abc');
        });
    });
    describe('titleCase', ()=> {
        it('should convert strings to title case', ()=> {
            cm.convert('abc', 'titleCase').should.equal('Abc');
        });
        it('should convert sentences to title case', ()=> {
            cm.convert('he lived long', 'titleCase').should.equal('He Lived Long');
        });
    });   
});
