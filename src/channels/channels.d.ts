interface SubscribeOptions {
    autoFetch: boolean;
}
// interface ChannelManager {
//     subscribe: (topics: string[] | string, options: SubscribeOptions) => string;
//     unsubscribe: (token: string) => void;
//     unsubscribeAll: () => void;
//     publish: () => Promise<Publishable>;
// }

interface matchFunction extends Function {
    (prefix:string):boolean | string;
}

interface Publishable {
    name: string;
    value: any;
}


interface PublishOptions {
    readOnly: boolean | string[];
    silent: boolean | string[] | { except: string[] };
}


interface HandlerOptions extends SubscribeOptions, PublishOptions {

}

interface BaseHandler {
    subscribeHandler?: (topics: string[], options: SubscribeOptions, match?:string)=> Promise<string[]>;
    unsubscribeHandler?: (unsubscribedTopics: string[], remainingTopics: string[])=> void;
    publishHandler?: (publishData: Publishable[], options: PublishOptions, match?:string)=> Promise<Publishable[]>;
}

interface handlerMatcher {
    (topic: string): string | false;
}
interface Handler extends BaseHandler {
    match: handlerMatcher;
    name?: string;
    isDefault?: boolean;
    options?: HandlerOptions;
    [propName: string]: any;
}

interface MatchedHandler extends Handler {
    data?: Publishable[];
    matched: string;
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
