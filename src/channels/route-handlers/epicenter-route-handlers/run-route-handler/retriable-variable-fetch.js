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
        const goodVariables = variables.filter((vName)=> {
            const baseName = vName.split('[')[0];
            const isBad = info.context.names.indexOf(baseName) !== -1;
            return !isBad;
        });
        return retriableFetch(runService, goodVariables);
    });
}
