Ext.define('SafeStartApp.controller.Auth', {
    extend: 'Ext.app.Controller',
    mixins: ['SafeStartApp.controller.mixins.Form'],
    requires: [
        //models
        'SafeStartApp.model.UserAuth',
        // dialogs
        'SafeStartApp.view.dialogs.UserProfile'
    ],

    config: {
        routes: {
            ':': Ext.empyFn
        },
        control: {
            loginButton: {
                tap: 'loginAction'
            },
            logoutButton: {
                tap: 'logoutAction'
            },
            showProfileDlgButton: {
                tap: 'showProfileDlgAction'
            },
            updateProfileButton: {
                tap: 'updateProfileAction'
            }
        },

        refs: {
            loginButton: 'SafeStartAuthForm > button[action=login]',
            logoutButton: 'SafeStartMainToolbar > button[action=logout]',
            loginForm: 'SafeStartAuthForm',
            showProfileDlgButton: 'SafeStartMainToolbar > button[action=update_profile]',
            updateProfileForm: 'SafeStartUserProfileForm',
            updateProfileButton: 'SafeStartUserProfileDialog > button[action=save-data]'
        }
    },

    loginAction: function () {
        window.location.replace('#');
        if (!this.userAuthModel)this.userAuthModel = Ext.create('SafeStartApp.model.UserAuth');
        if (this.validateFormByModel(this.userAuthModel, this.getLoginForm())) {
            SafeStartApp.loadedMainMenu = false;
            SafeStartApp.companyModel = SafeStartApp.model.Company.create({});
            SafeStartApp.AJAX('user/login', this.getLoginForm().getValues(), function (result) {
                Ext.Viewport.fireEvent('userLogin');
                SafeStartApp.loadMainMenu();
            });
        }
    },

    logoutAction: function() {
        var self = this;
        SafeStartApp.AJAX('user/logout', {}, function (result) {
            if (self.profileDlg) {
                self.profileDlg.destroy();
                delete self.profileDlg;
            }
            Ext.Viewport.fireEvent('userLogout');
            SafeStartApp.currentUser = result.userInfo;
            Ext.Ajax.abortAll();
            SafeStartApp.loadMainMenu();
        });
    },

    showProfileDlgAction: function() {
        if (!this.profileDlg) {
            this.profileDlg = Ext.Viewport.add(Ext.create('SafeStartApp.view.dialogs.UserProfile'));
            this.profileDlg.addListener('save-data', this.updateProfileAction, this);
        }
        this.profileDlg.show();
    },

    updateProfileAction: function(dlg, e) {
        var self = this;
        if (!this.userProfileModel)this.userProfileModel = Ext.create('SafeStartApp.model.User');
        if (this.validateFormByModel(this.userProfileModel, this.getUpdateProfileForm())) {
            SafeStartApp.AJAX('user/'+SafeStartApp.userModel.get('id')+'/profile/update', this.getUpdateProfileForm().getValues(), function (result) {
                Ext.iterate(self.getUpdateProfileForm().getFields(), function (key, item) { SafeStartApp.userModel.set(key, item.getValue()); }, this);
                self.getShowProfileDlgButton().setText(SafeStartApp.userModel.get('firstNaself') +' '+ SafeStartApp.userModel.get('lastNaself'));
                dlg.hide();
            });
        }
    }
});