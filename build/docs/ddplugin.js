const fs = require('fs');

function paramsToTable(params) {
    if (!params || !params.length) {
        return 'None';
    }

    const toRow = (arr)=> `|${arr.join('|')}|`;
    const headers = ['Required?', 'Name', 'Type', 'Description'];
    const paramRows = params.map((param)=> {
        const isOptional = param.isOptional || param.name.indexOf('[') === 0;
        const name = param.name.replace('[', '').replace(']', '');
        const type = param.types && param.types.length ? param.types.join(' / ') : 'any';
        return toRow([
            isOptional ? '&nbsp;' : 'Yes',
            name,
            type.indexOf('http') === -1 ? `\`${type}\`` : type,
            param.description, 
        ]);
    });
    const tbl = [
        toRow(headers),
        toRow(headers.map(()=> '------')),
        ...paramRows
    ].join('\n');
    return tbl;
}

const plugin = (data)=> new Promise((resolve, reject)=> {
    // fs.writeFileSync('output-raw.json', JSON.stringify(data, null, 2));

    const parsedFiles = data.files.map((file)=> {
        const pathParams = file.name.split('/');
        const relevantModuleName = pathParams[pathParams.length - 2]; //last item is index.js

        file.name = relevantModuleName;
        
        const splitMethodsAndConfig = file.methods.reduce((accum, m)=> {
            const typeKey = `type_${m.type}`;
            accum[typeKey] = (accum[typeKey] || []).concat(m);
            return accum;
        }, {});

        splitMethodsAndConfig.methods = (splitMethodsAndConfig.type_method || []).map((m)=> {
            m.tags.example = m.tags.example.map((r)=> r.trim());
            m.parameterTable = paramsToTable(m.tags.param);
            m.name = m.name.split('.').reverse()[0];
            const ret = m.tags.return[0];
            m.returns = {
                type: ret && ret.types && ret.types[0],
                description: (ret && ret.description) ? `- ${ret.description}` : ''
            };
            return m;
        });

        const mainDescEl = splitMethodsAndConfig.type_class || splitMethodsAndConfig.type_function;
        file.description = mainDescEl && mainDescEl[0].description;

        const constructorOptions = splitMethodsAndConfig.type_constructor || splitMethodsAndConfig.type_function;
        file.constructorOptionsTable = '';
        if (constructorOptions) {
            const co = constructorOptions[0];
            file.constructorOptionsTable = paramsToTable(co.tags.property);
        }

        return Object.assign(file, splitMethodsAndConfig);
    });
    resolve(parsedFiles);
});

module.exports = plugin;
