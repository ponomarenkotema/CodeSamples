Ext.define('SafeStartApp.store.AbstractStore', {
    extend: 'Ext.data.Store',
    mixins: ['Ext.mixin.Observable'],

    config: {
        autoLoad: false,
        listeners: {
            scope: this,
            beforeload: function (store) {
                if (store.getProxy().lastRequest && Ext.Ajax.isLoading(store.getProxy().lastRequest)) {
                    Ext.Ajax.abort(store.getProxy().lastRequest);
                }
            }
        }
    },

    loadData: function () {
        Ext.apply(this, {
            currentPage: 1
        });
        this.load({
            callback: function (records, operation, success) {
                if (operation.getError() && operation.getError().statusText != 'transaction aborted') {
                    SafeStartApp.showFailureInfoMsg(Ext.getClass(operation.getError().statusText));
                    this.fireEvent('data-load-failure', this);
                } else if (operation.getResponse() && operation.getResponse().responseText) {
                    var result = Ext.decode(operation.getResponse().responseText);
                    if (result.meta && (parseInt(result.meta.errorCode) != 0)) {
                        if (result.data && result.data.errorMessage) SafeStartApp.showFailureInfoMsg(result.data.errorMessage);
                        else SafeStartApp.showFailureInfoMsg('Operation filed');
                        this.fireEvent( 'data-load-failure', this);
                    } else {
                        this.fireEvent('data-load-success', this);
                    }
                } else {
                    this.fireEvent('data-load-success', this);
                }
            },
            scope: this
        });
    }
});
