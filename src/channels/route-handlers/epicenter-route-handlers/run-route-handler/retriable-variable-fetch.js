import { difference } from 'lodash';

//Opaquely handle missing variables
export function retriableFetch(runService, variables) {
    if (!variables || !variables.length) {
        return $.Deferred().resolve({}).promise();
    }
    return runService.variables().query(variables).catch((e)=> {
        const response = e.responseJSON;
        const info = response.information;
        if (info.code !== 'VARIABLE_NOT_FOUND') {
            throw e;
        }
        const goodVariables = difference(variables, info.context.names);
        return retriableFetch(runService, goodVariables);
    });
}
