## Collection Converters

Collection converters operate equally on arrays and objects (key-value maps). i.e. for `<ul data-f-foreach="list | filter(a)"><li></li></button>`, `users` can either be `[a, b, c]` in which case it'll return `[a]` or `{ a: 1, b: 2}` in which case it'll return `{ a: 1}`.