Ext.define('SafeStartApp.controller.mixins.Form', {

    validateFormByModel: function(model, form, title) {
        var validateMessage = "";
        var formFields = form.getFields();
        model.setData(form.getValues());
        var errors = model.validate();
        Ext.iterate(formFields, function (key, val) {
            if (errors.getByField(key)[0]) {
                validateMessage += errors.getByField(key)[0].getMessage() + "<br>";
                val.addCls('x-invalid');
            } else {
                val.removeCls('x-invalid');
            }
        });
        if (errors.isValid()) {
           return true;
        } else {
            Ext.Msg.alert(title || "Please check required fields.", validateMessage, Ext.emptyFn());
            return false;
        }
    }

});
