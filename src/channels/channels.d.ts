interface Publishable {
    name: string;
    value: any;
}


interface SubscribeOptions {
    autoFetch: boolean;
}

// declare class ChannelManager {
//     constructor();
//     subscribe(topics: string[] | string, options: SubscribeOptions): string;
//     unsubscribe(token: string): void;
//     unsubscribeAll(): void;
//     publish(topic: string | Publishable, value?:any, options?:PublishOptions): Promise<Publishable>;
//     notify(topic: string | Publishable, value?:any): Promise<Publishable>;
// }

interface PublishOptions {
    readOnly: boolean | string[];
    silent: boolean | string[] | { except: string[] };
}


interface HandlerOptions extends SubscribeOptions, PublishOptions {

}

interface BaseHandler {
    subscribeHandler?: (topics: string[], options: SubscribeOptions, match?:string)=> Promise<Publishable[]>;
    unsubscribeHandler?: (unsubscribedTopics: string[], remainingTopics: string[])=> void;
    publishHandler?: (publishData: Publishable[], options: PublishOptions, match?:string)=> Promise<Publishable[]>;
}

interface matchFunction extends Function {
    (topic:string, options?:any): string | false;
}
interface Handler extends BaseHandler {
    match: matchFunction;
    name?: string;
    isDefault?: boolean;
    options?: HandlerOptions;
    data?: Publishable[];
    [propName: string]: any;
}

interface Subscription {
    id: string;
    batch: boolean;
    cache: boolean;
    topics: string[];
    callback: Function;
}



interface Router extends BaseHandler {
    
}
