function toImplicitType(data) {
    const objRegex = /^(?:\{.*\})$/;
    const arrRegex = /^(?:\[.*])$/;

    let converted = data;
    if (typeof data === 'string') {
        converted = data.trim();

        if (converted === 'true') {
            converted = true;
        } else if (converted === 'false') {
            converted = false;
        } else if (converted === 'null') {
            converted = null;
        } else if (converted === 'undefined') {
            converted = '';
        } else if (converted.charAt(0) === '\'' || converted.charAt(0) === '"') {
            converted = converted.substring(1, converted.length - 1);
        } else if ($.isNumeric(converted)) {
            converted = +converted;
        } else if (arrRegex.test(converted)) {
            const bracketReplaced = converted.replace(/[[\]]/g, '');
            if (!bracketReplaced) return [];
            const parsed = bracketReplaced.split(/,(?![^[]*])/).map((val)=> {
                return toImplicitType(val);
            });
            return parsed;
        } else if (objRegex.test(converted)) {
            try {
                converted = JSON.parse(converted);
            } catch (e) {
                console.error('toImplicitType: couldn\'t convert', converted);
            }
        }
    }
    return converted;
}

function splitUnescapedCommas(str) {
    const regex = /(\\.|[^,])+/g;
    let m;

    const op = [];
    while ((m = regex.exec(str)) !== null) { //eslint-disable-line
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        m.forEach(function (match, groupIndex) {
            if (groupIndex === 0) {
                op.push(match.replace('\\', ''));
            }
        });
    }
    return op;
}

function splitNameArgs(value) {
    value = value.trim();
    const fnName = value.split('(')[0];
    const params = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
    const args = splitUnescapedCommas(params).map((p)=> p.trim());
    return { name: fnName, args: args };
}

/**
 * @param  {string} value
 * @return {{ name: string, value: string[]}[]}       [description]
 */
function toPublishableFormat(value) {
    const split = (value || '').split('|');
    const listOfOperations = split.map(function (value) {
        if (value && value.indexOf('=') !== -1) {
            const split = value.split('=');
            return { name: split[0].trim(), value: [split[1].trim()] };
        }
        const parsed = splitNameArgs(value);
        return { name: parsed.name, value: parsed.args };
    });
    return listOfOperations;
}

export { toImplicitType, toPublishableFormat, splitNameArgs };
