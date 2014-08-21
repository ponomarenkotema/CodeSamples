Ext.define('SafeStartApp.store.mixins.FilterByField', {

    filterStoreDataBySearchFiled: function (store, searchField, recordField) {
        var value = searchField.getValue();
        store.clearFilter(!!value);
        if (!value) return;

        var searches = value.split(','),
            regexps = [],
            i, regex;
        //loop them all
        for (i = 0; i < searches.length; i++) {
            //if it is nothing, continue
            if (!searches[i]) continue;
            regex = searches[i].trim();
            regex = regex.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
            //if found, create a new regular expression which is case insenstive
            regexps.push(new RegExp(regex.trim(), 'i'));
        }
        store.filter(function (record) {
            var matched = [];
            //loop through each of the regular expressions
            for (i = 0; i < regexps.length; i++) {
                var search = regexps[i],
                    didMatch = search.test(record.get(recordField));
                //if it matched the first or last name, push it into the matches array
                matched.push(didMatch);
            }
            return (regexps.length && matched.indexOf(true) !== -1);
        });
    },

    filterStoreDataByFiled: function (store, value, recordField) {
        store.clearFilter(!!value);
        if (!value) return;
        store.filter(function (record) {
            return (record.get(recordField) == value);
        });
    }

});
