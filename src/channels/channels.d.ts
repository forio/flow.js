interface matchFunction extends Function {
    (prefix:string):boolean | string;
}

interface Publishable {
    name: string;
    value: any;
}

interface SubscribeOptions {
    autoFetch: boolean;
}
interface PublishOptions {
    readOnly: boolean | string[];
    silent: boolean | string[] | { except: string[] };
}

interface subscribeHandler extends Function {
    (topics: string[], options: SubscribeOptions, match?:string): void;
}
interface publishHandler extends Function {
    (publishData: Publishable[], options: PublishOptions, match?:string): Promise<Publishable[]>;
}

interface HandlerOptions extends SubscribeOptions, PublishOptions {

}

interface BaseHandler {
    subscribeHandler?: subscribeHandler;
    unsubscribeHandler?: Function;
    publishHandler?: publishHandler;
}

interface Handler extends BaseHandler {
    name: string;
    match: Function;
    isDefault?: boolean;
    options: HandlerOptions;
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
