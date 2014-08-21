Ext.define('SafeStartApp.view.pages.Vehicles', {
    extend: 'Ext.Container',
    requires: [
        'SafeStartApp.view.pages.toolbar.Main',
        'SafeStartApp.view.pages.nestedlist.Vehicles',
        'SafeStartApp.view.pages.panel.VehicleInspection',
        'SafeStartApp.store.MenuVehicles'
    ],
    alias: 'widget.SafeStartVehiclesPage',

    config: {
        title: 'Vehicles',
        styleHtmlContent: true,
        scrollable: false,
        layout: 'hbox',
        tab: {
            action: 'vehicles'
        }
    },

    initialize: function () {
        this.setItems([{
            xtype: 'SafeStartToolbarMain',
            docked: 'top'
        }, {
            xtype: 'SafeStartNestedListVehicles',
            store: this.createVehicleStore() 
        }, {
            xtype: 'panel',
            cls: 'sfa-info-container',
            name: 'info-container',
            layout: 'card',
            flex: 2,
            minWidth: 150,
            scrollable: false,
            items: [{
                xtype: 'panel',
                name: 'vehicle-info',
                scrollable: false,
                layout: 'card'
            }, {
                xtype: 'SafeStartVehicleInspection'
            }]
        }]);

        this.callParent();
    },

    createVehicleStore: function () {
        var vehiclesStore = Ext.create('SafeStartApp.store.Vehicles'),
            companyId = SafeStartApp.userModel.get('companyId');

        vehiclesStore.getProxy().setExtraParam('companyId', companyId);
        return vehiclesStore;
    }
});