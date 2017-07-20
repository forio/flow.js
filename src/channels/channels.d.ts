interface Publishable {
    name: string;
    value: any;
}

interface BaseHandler {
    subscribeHandler?: Function;
    unsubscribeHandler?: Function;
    publishHandler?: Function;
}

interface Handler extends BaseHandler {
    match: Function;
    isDefault?: boolean;
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
