Ext.define('SafeStartApp.controller.Companies', {
    extend: 'Ext.app.Controller',
    mixins: ['SafeStartApp.controller.mixins.Form'],

    requires: [
        'SafeStartApp.model.CompanySubscription'
    ],

    config: {
        control: {
            navMain: {
                itemtap: 'onSelectAction'
            },
            addCompanyButton: {
                tap: 'addAction'
            },
            companiesPage: {
                 activate: 'activateCompaniesPage'
            }
        },

        refs: {
            main: 'SafeStartCompaniesPage',
            pages: 'SafeStartMainView',
            mainToolbar: 'SafeStartCompaniesPage SafeStartMainToolbar',
            companiesPage: 'SafeStartCompaniesPage',
            companyPage: 'SafeStartCompanyPage',
            usersPage: 'SafeStartUsersPage',
            alertsPage: 'SafeStartAlertsPage',
            navMain: 'SafeStartCompaniesPage list[name=companies]',
            companyInfoPanel: 'SafeStartCompaniesPage panel[name=company-info]',
            addCompanyButton: 'SafeStartCompaniesPage button[action=add-company]'
        }
    },


    activateCompaniesPage: function () {
        var selection = this.getNavMain().getSelection();
        if (SafeStartApp.companyModel.get('id')) {
            if (!selection.length || selection[0] !== SafeStartApp.companyModel) {
                this.getNavMain().select(SafeStartApp.companyModel);
                this.fillCompanyForm(SafeStartApp.companyModel);
            }
        }
    },

    onSelectAction: function (element, index, target, record) {
        var button = null;
        if (Ext.os.deviceType !== 'Desktop') {
            button = this.getMainToolbar().down('button[action=toggle-menu]');
            if (button) {
                button.getHandler().call(button, button);
            }
        }
        this.fillCompanyForm(record);
    },

    fillCompanyForm: function (record) {
        if (!this.currentCompanyForm) this._createForm();
        this.currentCompanyForm.setRecord(record);
        try {
            if (!record.get('restricted')) this.currentCompanyForm.down('fieldset').down('fieldset').disable();
            if (record.get('expiry_date')) this.currentCompanyForm.down('datepickerfield').setValue(new Date(record.get('expiry_date') * 1000));
            this.currentCompanyForm.down('button[name=delete-data]').show();
            this.currentCompanyForm.down('button[name=send-credentials]').show();
            this.currentCompanyForm.down('button[name=manage]').show();
            this.currentCompanyForm.down('button[name=reset-data]').hide();
            SafeStartApp.companyModel = record;
            this.getCompanyPage().enable();
            this.getUsersPage().enable();
            this.getAlertsPage().enable();
        } catch (e) {
            SafeStartApp.logException(e);
        }
    },

    addAction: function () {
        if (!this.currentCompanyForm) this._createForm();
        if (this.companyModel) this.companyModel.destroy();
        this.companyModel = Ext.create('SafeStartApp.model.Company');
        this.currentCompanyForm.setRecord(this.companyModel);
        this.currentCompanyForm.down('fieldset').down('fieldset').disable();
        this.currentCompanyForm.down('button[name=delete-data]').hide();
        this.currentCompanyForm.down('button[name=send-credentials]').hide();
        this.currentCompanyForm.down('button[name=manage]').hide();
        this.currentCompanyForm.down('button[name=reset-data]').show();
        this.currentCompanyForm.down('textfield[name=firstName]').enable();
        this.getCompanyPage().disable();
        this.getUsersPage().disable();
    },

    saveAction: function () {
        if (!this.companyModel) this.companyModel = Ext.create('SafeStartApp.model.Company');
        if (this.validateFormByModel(this.companyModel, this.currentCompanyForm)) {
            if (!this.companySubscriptionModel) this.companySubscriptionModel = Ext.create('SafeStartApp.model.CompanySubscription');
            if (this.currentCompanyForm.getValues().restricted) {
                if (this.validateFormByModel(this.companySubscriptionModel, this.currentCompanyForm)) {
                    this._saveData();
                }
            } else {
                this._saveData();
            }
        }
    },

    sendCredentialsAction: function () {
        var self = this;
        SafeStartApp.AJAX('admin/company/' + this.currentCompanyForm.getValues().id + '/send-credentials', {}, function (result) {

        });
    },

    deleteAction: function () {
        var self = this;
        Ext.Msg.confirm("Confirmation", "Are you sure you want to delete this company account?", function (btn) {
            if (btn != 'yes') {
                return;
            }
            SafeStartApp.AJAX('admin/company/' + self.currentCompanyForm.getValues().id + '/delete', {}, function (result) {
                self.getNavMain().getStore().loadData();
                self.currentCompanyForm.reset();
                self.currentCompanyForm.down('button[name=delete-data]').hide();
                self.currentCompanyForm.down('button[name=send-credentials]').hide();
                self.currentCompanyForm.down('button[name=manage]').hide();
                self.currentCompanyForm.down('button[name=reset-data]').show();
                self.getCompanyPage().disable();
                self.getUsersPage().disable();
            });
        });
    },

    resetAction: function () {
        this.currentCompanyForm.reset();
    },

    openSelectedAction: function () {
        this.redirectTo('company/' + SafeStartApp.companyModel.get('id'));
    },

    _createForm: function () {
        if (!this.currentCompanyForm) {
            this.currentCompanyForm = Ext.create('SafeStartApp.view.forms.Company');
            this.getCompanyInfoPanel().removeAll(true);
            this.getCompanyInfoPanel().setHtml('');
            this.getCompanyInfoPanel().add(this.currentCompanyForm);
            this.currentCompanyForm.addListener('save-data', this.saveAction, this);
            this.currentCompanyForm.addListener('send-credentials', this.sendCredentialsAction, this);
            this.currentCompanyForm.addListener('reset-data', this.resetAction, this);
            this.currentCompanyForm.addListener('delete-data', this.deleteAction, this);
            this.currentCompanyForm.addListener('manage', this.openSelectedAction, this);
            this.currentCompanyForm.addListener('remove', function () {
                this.currentCompanyForm = null;
            }, this);
        }
    },

    _saveData: function () {
        var self = this;
        var formValues = this.currentCompanyForm.getValues();
        if (this.currentCompanyForm.down('datepickerfield').getValue()) formValues.expiry_date = (this.currentCompanyForm.down('datepickerfield').getValue().getTime() / 1000);
        else formValues.expiry_date = null;
        SafeStartApp.AJAX('admin/company/' + this.currentCompanyForm.getValues().id + '/update', formValues, function (result) {
            if (result.companyId) {
                self._reloadStore(result.companyId);
                self.currentCompanyForm.down('button[name=delete-data]').show();
                self.currentCompanyForm.down('button[name=send-credentials]').show();
                self.currentCompanyForm.down('button[name=reset-data]').hide();
            }
        });
    },

    _reloadStore: function (companyId) {
        this.getNavMain().getStore().loadData();
        this.getNavMain().getStore().addListener('data-load-success', function () {
            if (!companyId) return;
            this.currentCompanyForm.setRecord(this.getNavMain().getStore().getById(companyId));
            SafeStartApp.companyModel = this.getNavMain().getStore().getById(companyId);
            if (!this.getNavMain().getStore().getById(companyId).get('restricted')) this.currentCompanyForm.down('fieldset').down('fieldset').disable();
            if (this.getNavMain().getStore().getById(companyId).get('expiry_date')) this.currentCompanyForm.down('datepickerfield').setValue(new Date(this.getNavMain().getStore().getById(companyId).get('expiry_date') * 1000));
            this.currentCompanyForm.down('button[name=manage]').show();
        }, this);
    }

});