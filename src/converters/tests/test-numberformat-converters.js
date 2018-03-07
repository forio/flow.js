const cm = require('src/converters/converter-manager.js');
const numberConverter = require('../numberformat-converter');
describe('Number format Converter', ()=> {
    describe('#alias', ()=> {
        const validZeros = ['0', '00', '00.00', '0,000', '0,000.0'];
        const validHashes = ['#', '##', '##.##', '#,###', '#,###.#'];
        const percents = ['%', '0%', '0.00%', '#,###%', '#,###.#%'];
        const shortFormats = ['s0', 's0.0', 's#,##'];
        const validCurrencies = ['$#,###', '€0.0'];

        const totalValid = [].concat(validZeros, validHashes, percents, shortFormats, validCurrencies);

        it('should match known formats', ()=> {
            totalValid.forEach((v)=> {
                numberConverter.alias(v).should.equal(true);
            });
        });
        it('should not match invalid formats', ()=> {
            const invalid = ['apples', '0apples#', 's0goo', 'a'];
            invalid.forEach((v)=> {
                numberConverter.alias(v).should.equal(false);
            });
        });
        it('should match formats with prefixes', ()=> {
            totalValid.forEach((v)=> {
                numberConverter.alias(`$ ${v}`).should.equal(true);
            });
        });
        it('should match formats with prefixes and suffixes', ()=> {
            totalValid.forEach((v)=> {
                numberConverter.alias(`$ ${v} apples`).should.equal(true);
            });
        });
    });
    describe('#parse', ()=> {
        it('should convert plain strings to numbers', ()=> {
            cm.parse('1', '$###.00').should.equal(1);
        });

        it('should convert strings with commas to numbers', ()=> {
            cm.parse('1,000,000', '$###.00').should.equal(1000000);
        });

        it('should convert strings with periods to numbers', ()=> {
            cm.parse('1,000,000.01', '$###.00').should.equal(1000000.01);
        });

        it('should convert percents to decimals', ()=> {
            cm.parse('1%', '$###').should.equal(0.01);
            cm.parse('1.5%', '$###').should.equal(0.015);
        });

        it('should convert strings with short units', ()=> {
            cm.parse('1K', '$###.00').should.equal(1000);
            cm.parse('1k', '$###.00').should.equal(1000);
            cm.parse('1m', '$###.00').should.equal(1000000);
            cm.parse('1M', '$###.00').should.equal(1000000);
            cm.parse('1B', '$###.00').should.equal(1000000000);
            cm.parse('1b', '$###.00').should.equal(1000000000);
        });

        it('should convert strings with short units and commas', ()=> {
            cm.parse('1,000K', '$###.00').should.equal(1000000);
            cm.parse('1,123.01k', '$###.00').should.equal(1123010);
        });
    });

    describe('#convert', ()=> {
        it('should convert strings to formatted strings', ()=> {
            cm.convert('1000000', '$#,###.00').should.equal('$1,000,000.00');
            cm.convert('1000000', '$#,###').should.equal('$1,000,000');
        });
        it('should convert numbers to formatted strings', ()=> {
            cm.convert(1000000, '$#,###.00').should.equal('$1,000,000.00');
        });
        it('should convert arrays to formatted array of strings', ()=> {
            cm.convert([2, 1000, 1000000], '$#,###.00').should.eql(['$2.00', '$1,000.00', '$1,000,000.00']);
        });
    });
});
