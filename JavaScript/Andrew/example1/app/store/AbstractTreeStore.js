Ext.override(Ext.data.proxy.Ajax, {
    doRequest: function (operation, callback, scope) {
        var me = this,
            writer = me.getWriter(),
            request = me.buildRequest(operation);

        request.setConfig({
            headers: me.getHeaders(),
            timeout: me.getTimeout(),
            method: me.getMethod(request),
            callback: me.createRequestCallback(request, operation, callback, scope),
            scope: me,
            proxy: me,
            useDefaultXhrHeader: me.getUseDefaultXhrHeader()
        });

        if (operation.getWithCredentials() || me.getWithCredentials()) {
            request.setWithCredentials(true);
            request.setUsername(me.getUsername());
            request.setPassword(me.getPassword());
        }

        // We now always have the writer prepare the request
        request = writer.write(request);

        this.lastRequest = Ext.Ajax.request(request.getCurrentConfig());

        return request;
    }
});

Ext.define('SafeStartApp.store.AbstractTreeStore', {
    extend: 'Ext.data.TreeStore',
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
        this.load({
            callback: function (records, operation, success) {
                if (operation.getError() && operation.getError().statusText != 'transaction aborted') {
                    SafeStartApp.showFailureInfoMsg(operation.getError().statusText);
                    this.fireEvent('data-load-failure', this);
                } else if (operation.getResponse() && operation.getResponse().responseText) {
                    var result = Ext.decode(operation.getResponse().responseText);
                    if (result.meta && parseInt(result.meta.errorCode)) {
                        if (result.data && result.data.errorMessage) SafeStartApp.showFailureInfoMsg(result.data.errorMessage);
                        else SafeStartApp.showFailureInfoMsg('Operation filed');
                        this.fireEvent('data-load-failure', this);
                    }
                } else {
                    this.fireEvent('data-load-success', this);
                }
            },
            scope: this
        });
    }
});
