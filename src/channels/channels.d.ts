interface PublishObject {
    name: string;
    value: any;
}

interface Handler {
    match: Function;
    subscribeHandler?: Function;
    unsubscribeHandler?: Function;
    publishHandler?: Function;
    isDefault?: boolean;
}

interface Subscription {
    id: string;
    batch: boolean;
    cache: boolean;
    topics: string[];
    callback: Function;
}
