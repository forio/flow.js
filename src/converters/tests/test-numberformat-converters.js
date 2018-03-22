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
            numberConverter.parse('1').should.equal(1);
        });

        it('should convert strings with commas to numbers', ()=> {
            numberConverter.parse('1,000,000').should.equal(1000000);
        });

        it('should convert strings with periods to numbers', ()=> {
            numberConverter.parse('1,000,000.01').should.equal(1000000.01);
        });

        it('should convert percents to decimals', ()=> {
            numberConverter.parse('1%', '$###').should.equal(0.01);
            numberConverter.parse('1.5%', '$###').should.equal(0.015);
        });

        it('should convert strings with short units', ()=> {
            numberConverter.parse('1K').should.equal(1000);
            numberConverter.parse('1k').should.equal(1000);
            numberConverter.parse('1m').should.equal(1000000);
            numberConverter.parse('1M').should.equal(1000000);
            numberConverter.parse('1B').should.equal(1000000000);
            numberConverter.parse('1b').should.equal(1000000000);
        });

        it('should convert strings with short units and commas', ()=> {
            numberConverter.parse('1,000K').should.equal(1000000);
            numberConverter.parse('1,123.01k').should.equal(1123010);
        });
    });

    describe('#convert', ()=> {
        it('should convert strings to formatted strings', ()=> {
            numberConverter.convert('1000000', '$#,###.00').should.equal('$1,000,000.00');
            numberConverter.convert('1000000', '$#,###').should.equal('$1,000,000');
        });
        it('should convert numbers to formatted strings', ()=> {
            numberConverter.convert(1000000, '$#,###.00').should.equal('$1,000,000.00');
        });
        it('should allow spaces', ()=> {
            numberConverter.convert(1000000, '$ #,###.00').should.equal('$ 1,000,000.00');
        });
    });
});
