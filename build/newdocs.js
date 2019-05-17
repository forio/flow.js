const attrManagerDocs = require('../src/dom/attribute-manager/docs-index').default;
const fs = require('fs');

function filenameFromTitle(title) {
    const fn = title.trim().toLowerCase().split(' ').join('-');
    return `${fn}.md`;
}
function normalize(rootPath, docItem) {
    const srcFile = (typeof docItem === 'string') ? `${docItem}.md` : docItem.file; 
    const fileContents = fs.readFileSync(`${rootPath}/${srcFile}`, 'utf-8');
    const title = docItem.label || fileContents.trim().split(/[\r\n]/)[0].replace('##', '').trim();

    let children = [];
    if (docItem.list) {
        children = docItem.list.map((v)=> {
            return normalize(rootPath, v);
        });
    }
    return {
        title: title,
        contents: fileContents,
        saveAs: filenameFromTitle(title),
        children: children
    };
}

const allDocs = [attrManagerDocs];
const index = {};
allDocs.forEach(function (sectionDocs) {
    sectionDocs.list.forEach(function (section) {
        const val = normalize(section);

        index.push({
            title: section.label,

        });
    });
});