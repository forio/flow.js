module.exports = {
    normalizePublishInputs: function (topic, publishValue, options) {
        if ($.isPlainObject(topic)) {
            var mapped = Object.keys(topic).map(function (t) {
                return { name: t, value: topic[t] };
            });
            return { toPublish: mapped, options: publishValue };
        }
        if ($.isArray(topic)) {
            return { toPublish: topic, options: publishValue };
        }
        return { toPublish: [{ name: topic, value: publishValue }], options: options };
    }
};
