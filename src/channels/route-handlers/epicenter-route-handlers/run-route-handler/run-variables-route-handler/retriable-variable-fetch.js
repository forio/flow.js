function hasValidBrackets(variable) {
    const brackets = {
        '[': 0,
        '{': 0,
        '(': 0,
        '<': 0,
    };
    let isValid = true;
    for (let i = 0; i < variable.length; i++) {
        const char = variable[i];
        if ('[{(<'.indexOf(char) >= 0) {
            // Opening bracket
            brackets[char] = brackets[char] + 1;
        } else if (']})>'.indexOf(char) >= 0) {
            // Closing bracket
            let correspondingChar;
            switch (char) {
                case ']':
                    correspondingChar = '[';
                    break;
                case '}':
                    correspondingChar = '{';
                    break;
                case ')':
                    correspondingChar = '(';
                    break;
                case '>':
                    correspondingChar = '<';
                    break;
                default:
                    break;
            }
            if (brackets[correspondingChar] === 0) {
                isValid = false;
                break; // Break loop if there is a closing bracket before an opening bracket
            } else {
                brackets[correspondingChar] = brackets[correspondingChar] - 1;
            }
        }
    }
    isValid = isValid && Object.keys(brackets).reduce((acc, key)=> acc + brackets[key], 0) === 0;
    return isValid;
}

const MAX_RETRIES = 5;

//Opaquely handle missing variables
export function retriableFetch(runService, variables, retries) {
    retries = retries || 0;
    if (!variables || !variables.length) {
        return $.Deferred().resolve({}).promise();
    }
    const validVariables = variables.filter((v)=> hasValidBrackets(v));
    return runService.variables().query(validVariables).catch((e)=> {
        const response = e.responseJSON;
        const info = response.information;
        if (info.code !== 'VARIABLE_NOT_FOUND' || retries >= MAX_RETRIES) {
            throw e;
        }

        const goodVariables = variables.filter((vName)=> {
            const isBad = info.context.names.indexOf(vName) !== -1;
            return !isBad;
        });
        return retriableFetch(runService, goodVariables, retries + 1);
    });
}
