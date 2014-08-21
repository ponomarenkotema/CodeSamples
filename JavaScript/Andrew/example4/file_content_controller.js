define(
'js/app/controllers/file_content_controller',
['Ember', 'i18n'],
function (Ember) {
    'use strict';
    CMS.FileContentController = Ember.ObjectController.extend(Ember.Evented,{
        needs: 'files',
        versions: Ember.A([]),

        actions: {
            orderFile: function(){

            },

            cropFile: function(){

            },

            downloadFile: function(){
                var f = this.get('content'),
                    link = CMS.Tools.getContentUrlOfFile(f, 0);

                var win = window.open(link, f.name,'height=100,width=100');
                if ( window.focus) {
                    win.focus();
                }
                return false;
            },

            changeBg: function(color){
                if (color){
                    this.trigger('change-bg', color);
                }
                return false;
            },

            getVersions: function(){
                var v = parseInt(this.get('content.versions'), 10);

                Ember.Logger.log(' &&& getVersions', v, this.get('content.versions'));
                this.set('versions', Ember.A([]));
                if (v > 0){
                    while (v > 0){
                        this.versions.pushObject({version: v});
                        v--;
                    }
                    this.set('versions', this.versions);
                }
            },
            show: function(e, item){
                this.clearError();
                this.updateCounter();
                this.set('versions', false);
                if (!this.get('content.version')){
                    this.set('content.version', 0);
                }

                this.set('content.versionVisible', 0);

                this.trigger('show', e, item);
            },

            showError: function(text){
                this.set('isError', true);
                this.set('error', text);
            },

            goLeft: function(path, i){
                if (!i){
                    i = this.getCurrentFileIndex(path);
                }

                if (i.index > 0){
                    i.index --;
                } else {
                    i.index = i.length - 1;
                }
                if (i.files[i.index].get('type') > 0){
                    return this.send('goLeft', path, i);
                }
                this.set('content', i.files[i.index]);
                this.updateCounter(i);

                Ember.Logger.log(' &&& set content.versionVisible ', i.index);
            },

            goRight: function(path, i){
                if (!i){
                    i = this.getCurrentFileIndex(path);
                }
                if (i.index < (i.length - 1)){
                    i.index ++;
                } else {
                    i.index = 0;
                }
                if (i.files[i.index].get('type') > 0){
                    return this.send('goRight', path, i);
                }
                this.set('content', i.files[i.index]);
                this.updateCounter(i);

                Ember.Logger.log(' &&& set content.versionVisible ', i.index);
            }

        },



        getCurrentFileIndex: function(path){
            var files = this.get('controllers.files').getAllFiles(),
                currentIndex = -1;

            files.find(function(item, index){
                if(path === item.get('path')){
                    currentIndex = index;
                    return true;
                }
            }, this);

            return {index: currentIndex, length: files.length, files: files};
        },



        /**
         * showFileOfVersion
         * @param  {String} v version to set
         * @return {[type]}   [description]
         */
        showFileOfVersion: function(v){
            if (v > 0){
                v -= 1;
            }
            Ember.Logger.log(' &&& set content.versionVisible ' + v);
            this.set('content.versionVisible', v);
        },


        clearError: function(){
            this.set('isError', false);
            this.set('error', '');
        },

        updateCounter: function(c){
            if (!c){
                c = this.getCurrentFileIndex(this.get('content.path'));
            }
            this.set('content.current', c.index);
            this.set('content.total', c.length);
        }

    });

    return CMS.FileContentController;
});

