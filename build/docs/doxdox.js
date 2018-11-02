const dd = require('doxdox');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const templateFile = fs.readFileSync(path.resolve(__dirname, './general-doc-template.ejs'), 'utf-8');

const OP_FOLDER = path.resolve(__dirname, '../../documentation/generated');
const IP_FOLDER = path.resolve(__dirname, '../../src');
const files = [
    {
        src: 'src/dom/attributes/default-bind-attr/index.js',
        dest: 'scenario-manager/saved/index.html.md',
    },
];
/**
 * Assumes following input folder structure
 *  service/run-api-service
 *      index.js
 *      run-api-service.md (optional)
 *  Creates run-api-service/index.html.md
 */
files.forEach((ip)=> {
    const file = ip.src || ip;
    const srcFile = file.indexOf('.js') === -1 ? `${file}/index.js` : file;
    dd.parseFiles([`${IP_FOLDER}/${srcFile}`], {
        ignore: '', 
        parser: 'dox', 
        layout: path.resolve(__dirname, 'ddplugin.js')
    }).then((data)=> {
        const contents = _.template(templateFile)(data[0]);
        const key = file.split('/').reverse()[0].replace('.js', '');
        const prologue = [
            '---',
            `title: ${key}`,
            'layout: "jslib"',
            'isPage: true',
            '---',
        ].join('\n');
        let header = '';
        try {
            header = fs.readFileSync(`${IP_FOLDER}/${file}/${key}.md`, 'utf-8');
        } catch (e) {
            // console.log('No description file found for', file);
        }

        const destFile = ip.dest || `${key}/index.html.md`;
        const dest = `${OP_FOLDER}/${destFile}`;
        fs.writeFileSync(dest, [prologue, header, contents].join('\n'));
        console.log('Created', dest);
    });
});

