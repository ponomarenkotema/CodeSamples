Ext.define('SafeStartApp.store.Alerts', {
    extend: 'SafeStartApp.store.AbstractStore',

    requires: [
        'SafeStartApp.model.Alert'
    ],

    config: {
        model: 'SafeStartApp.model.Alert',

        proxy: {
            type: "ajax",
            url : "api/company/getvehiclealerts",
            reader: {
                type: "json",
                rootProperty: "data"
            }
        },

        pageSize: 10
    },

    checkForLastPage: function(store, records, isSuccessful) {
        var pageSize = store.getPageSize();
        var pageIndex = store.currentPage - 1;

        if (isSuccessful && records.length < pageSize) {
            var totalRecords = pageIndex * pageSize + records.length;
            store.setTotalCount(totalRecords);
        } else {
            store.setTotalCount(null);
        }
    },

    constructor: function (config) {
        this.callParent([config]);

        this.addBeforeListener('load', this.checkForLastPage, this);
    }
});
