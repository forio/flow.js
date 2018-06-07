import { difference } from 'lodash';

export function retriableFetch(runService, variables) {
    if (!variables || !variables.length) {
        return {};
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
