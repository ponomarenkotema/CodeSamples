Ext.define('SafeStartApp.view.Main', {
    extend: 'Ext.tab.Panel',
    xtype: 'SafeStartMainView',
    requires: [
        'SafeStartApp.model.User',
        'SafeStartApp.view.abstract.dialog'
    ],
    items: [],
    config: {
        tabBarPosition: 'bottom',
        items: [
            { xclass: 'SafeStartApp.view.pages.Auth'},
            { xclass: 'SafeStartApp.view.pages.Contact'}
        ]
    },
    initialize: function () {
        var me = this;
        this.callParent();
        Ext.each(this.query('tab'), function (tab) {
            tab.on({
                tap: function (tab, e) {
                    if (tab.config.action) {
                        me.fireEvent('changeTab', tab.config.action);
                        return false;
                    }
                },
                order: 'before'
            });
        });
    }
});


