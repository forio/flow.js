interface DomManager {
    bindAll: (elements:string[])=> void
}

interface NormalizedTopic {
    name: string,
    [key: string]: any
}


interface AttributeHandler {
    test: string|RegExp,
    target: string,
    unbind?(attr: string, $el: JQuery)
    parse?(topics: NormalizedTopic[]): NormalizedTopic[],
    handle?(value: any, prop: string, $el: JQuery, topics: NormalizedTopic[]): void;
}
