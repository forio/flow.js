interface DomManager {
    bindAll: (elements:string[])=> void
}

interface NormalizedTopic {
    name: string,
    [key: string]: any
}

type attributeMatcher = (value: string)=> boolean;
interface AttributeHandler {
    test: string | RegExp | attributeMatcher
    target: string
    init?(attr: string, topics: NormalizedTopic[], $el: JQuery)
    unbind?(attr: string, $el: JQuery)
    parse?(topics: NormalizedTopic[]): NormalizedTopic[]
    handle(value: any, prop: string, $el: JQuery, topics: NormalizedTopic[]): void
}

interface ChannelOptions {
    [key: string]: any
}
interface Channel {
    publish(): Promise<any[]>
    subscribe(topics: String[] | String, callback: Function, options: ChannelOptions): string
    unsubscribe(subsid: string): void
}
