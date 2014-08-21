/**
 * @type controller
 * @file chat.js
 * @descr
 */
/*global Ext, App, window, PIE */
/*jslint browser:true, nomen: true */
Ext.ns('App.Controller');
App.Controller.Chat = Ext.extend(Ext.util.Observable, {
    /**
     * vars
     */
    view : null, // required
    eventsMng : null, // required
    userJID : null,
    chatID : null, // required
    chatType : null, // required
    chatUsers : null,
    isDestroyed : false,
    isCreated : false,
    msgsCount : 0,
    lastMsgDate: null,

    /**
     * constructor
     */
    constructor : function (config) {
        'use strict';
        Ext.apply(this, config);
        App.Controller.Chat.superclass.constructor.call(this);
        //Ext.override(App.Controller.Chat, App.Controller.Chat.History);
        // App.Log.logd('App.Controller.Chat.History');
        // App.Log.logd(new App.Controller.Chat.History());

        try {

            if (!this.view || !this.eventsMng || !this.chatID || !this.chatType) {
                App.Log.logd('view or eventsMng or chatID or chatType undefined ');
            }

            if (!this.model) {
                throw ' model undefined ';
            }

            this.view.on('send-msg', this.sendMsg, this);
            this.view.on('send-system-msg', this.displaySystemMessage, this);
            this.view.on('send-msg-notif-paused', this.sendMsgNotifPaused, this);
            this.view.on('send-msg-notif-compos', this.sendMsgNotifCompos, this);
            this.view.on('view-users-mng', this.showUsersMng, this);
            this.view.on('hide-users-mng', this.hide, this);
            this.view.on('view-users-list', this.showUsersList, this);
            this.view.on('chat-finish', this.onChatFinish, this);
            this.view.on('conf-create', this.onConfCreate, this);
            this.view.on('conf-enter', this.onConfEnter, this);
            this.view.on('user-delete', this.onRemoveUser, this);
            this.view.on('user-add', this.onAddUser, this);
            this.view.on('history-search-start', this.onSearchInHistoryStart, this);
            this.view.on('history-filter-start', this.onFilternHistoryStart, this);
            this.view.on('start-chat', function(id, name) {
                if (id) {
                    this.eventsMng.fireEvent('h-start-chat', id, {'jids': [id],'names': [name]});
                }
            }, this);
            this.view.on('start-call', function(id) {
                if (id) {
                    this.eventsMng.fireEvent('h-start-call',id, {'jids': [id],'names': [name]});
                }
            }, this);

            // global event for all chats
            this.eventsMng.on('hide', this.hide, this);
            this.eventsMng.on('tab-clicked', this.hide, this);
            this.eventsMng.on('contact-status', this.onUserStatus, this);
            this.eventsMng.on('contact-name-resolved', this.onNameResolved, this);
            this.eventsMng.on('event-add-members', function(chatId, jids, names) {
                if (chatId === this.chatID) {
                    this.addUsersToChat(jids, names);
                }
            }, this);
            this.eventsMng.on('call-event-talking', function(hid, id) {
                if (this.chatID === id) {
                    var tb = this.view.getTopToolbar();
                    tb.changeCallBtnIcon(true);
                }
            }, this);
            this.eventsMng.on('call-event-finished', function(hid, id) {
                if (this.chatID === id) {
                    var tb = this.view.getTopToolbar();
                    tb.changeCallBtnIcon(false);
                }
            }, this);

            this.addEvents(
                'show',
                'hide'
            );

        } catch (err) {
            this.errorLog(err);
        }
    },

    /**
     *
     */
    initUsersBar: function (users) {
        'use strict';
        var tb = this.view.getTopToolbar();
        tb.init(this.isModerator(), this.isConference());
    },

    /**
     * return true if conf
     */
    isConference: function () {
        'use strict';
        if (this.chatType.indexOf('conf') >= 0) {
            return true;
        } else {
            return false;
        }
    },

    /**
     * if we create chat
     */
    isModerator: function () {
        'use strict';
        return App.Main.isModerator(this.chatID, this.userJID);
    },

    /**
     * isActive
     */
    isActive: function () {
        'use strict';
        return this.isDestroyed;
    },

    /**
     *
     */
    getIsModerator: function (cb, scope) {
        'use strict';
        if (Ext.isFunction(cb)) {
            cb.call(scope, this.isModerator());
        }
        return this.isModerator();
    },

    /**
     * setActive
     */
    setActive: function (active) {
        'use strict';
        // disable toolbar buttons
        var tb = this.view.getTopToolbar();
        if (!active) {
            this.isDestroyed = true;
            if (this.isModerator()) {
                this.view.showCreateButton(true);
            }
            this.view.showSendForm(false);
        } else {
            this.isDestroyed = false;
            this.view.showSendForm(true);
            this.view.showCreateButton(false);
            this.view.showEnterButton(false);
        }
        tb.usersMenu.setDisabled(this.isDestroyed);
        if (this.isModerator()) {
            tb.addUsersMenu.setDisabled(this.isDestroyed);
        }
    },

    /**
     *
     */
    setDestroyed: function (destoyed, msg) {
        'use strict';
        if (destoyed) {
            var text = '';
            if (this.isActive) {
                this.setActive(false);
                if (!this.isModerator()) {
                    text = App.Lang.getStr('This chat conference has been destroyed.');
                    this.removeAllUsers();
                } else {
                    text = App.Lang.getStr('You finished the conference.');
                }
                if (msg) {
                    text = msg;
                }
                this.displaySystemMessage(text, true);
            }
        } else {
            this.setActive(true);
        }
    },

    /**
     * setRemoved
     */
    setRemoved: function () {
        'use strict';
        this.setActive(false);
        this.displaySystemMessage(App.Lang.getStr('You removed from the conference.'), true);
        this.removeAllUsers();
    },

    /**
     *
     */
    setFinished: function(declined) {
        this.setActive(false);
        if (!this.isModerator() && !declined) {
            this.displaySystemMessage(App.Lang.getStr('You left the conference.'), true);
            this.view.showEnterButton(true);
        }
    },

    /**
     * @recreate if true, we have new chat
     */
    show: function (recreate) {
        'use strict';
        var tb = this.view.getTopToolbar();

        if (!this.historyLoaded && this.model.getMsgCount(true) === 0){
            this.loadLastMsgs();
            /*Display messages from local store*/
            var items = App.Prefs.chatMsgs.get(this.chatID);
            if (items) {
                Ext.each(items.msgs, function (item) {
                    this.displayMessage(item.jid, item.msg, Date.parseDate(item.date, "c"), true);
                }, this);
                this.view.updateScrollBars(true);
            }
        }
        
        this.displayDelayedMsgs();

        tb.init(this.isModerator(), this.isConference());
        this.setTbTitle();

        this.initUsersBar();

        var activeCall = this.eventsMng.conversations.getActive(this.chatID, 'call');
        if (activeCall !== undefined && activeCall.item.isTalking) {
            tb.changeCallBtnIcon(true);
        }

        this.view.show();
        if (recreate) {
            this.setActive(true);
        }
        this.view.updateScrollBars(true);

        this.fireEvent('show');
    },

    /**
     *
     */
    hide: function () {
        'use strict';
        this.view.hide();
        this.fireEvent('hide');
    },

    /**
     *
     */
    setTbTitle: function (){
        var tb = this.view.getTopToolbar(),
            name = '';

        if (this.isConference()){
            if (!this.chatName){
                this.chatName = App.Main.cloneObj(this.chatUsers);
            }
            name = this.chatName.join(', ');
        } else {
            if (this.chatName){
                name = this.chatName;
            } else {
                name = this.chatID;
            }
        }
        tb.setTitle(this.chatType, name);
    },

    /**
     * update config of chat
     */
    update: function (newID, newChatType) {

        'use strict';
        this.chatID = newID;
        this.view.chatID = newID;
        this.chatType = newChatType;

        // getUserNameByJid
        var name = this.eventsMng.getContact(this.chatID, function (name) {
            this.view.setTitle(this.chatType + ' ' + name);
        }, this);

    },

    /**
     * load last msgs from server
     */
    loadLastMsgs: function () {
        'use strict';
        if (!this.historyLoaded) {
            App.Prefs.loadHistoryChatMsg(this.chatID, function (items) {
                App.Log.logd('loadHistoryChatMsg');
                App.Log.logd(items);
                if (items) {
                    this.parseHistoryResults(items);
                }
                this.historyLoaded = true;

            }, this);
        }
    },

    /**
     * will show users managment window (panel)
     */
    showUsersMng: function (id) {
        'use strict';
        App.Log.logd(' showUsersMng ' + this.chatID);
        var inChatUsers = this.view.usersList.getAllUsers();
        this.eventsMng.fireEvent('show-add-members-view', this.chatID, this.isConference(), inChatUsers);

    },

    /**
     * showUsersList
     */
    showUsersList: function (id) {
        'use strict';
        var ul = this.view.usersList;

        if (!ul.isVis) {
            ul.setVisible(true);
            ul.isVis = true;
        } else {
            ul.setVisible(false);
            ul.isVis = false;
        }
        
        this.view.updateScrollBars();
    },

    /**
     * remove all users from chat conference
     */
    removeAllUsers: function () {
        this.view.usersList.removeAllUsers();
    },

    /**
     * we send msg to user
     */
    sendMsg: function (to, msg, date) {
        'use strict';
        this.isComposing = false;
        // if conference we recived msg from xmpp, no need to display this
        if (this.chatType !== 'conf') {
            this.displayMessage(this.userJID, msg, date);
            this.view.updateScrollBars(true);
        }
        // fire event with chat ID and to destination
        this.eventsMng.sendMsg(this.chatID, to, msg);
    },

    /**
     * sendMsgNotifPaused
     */
    sendMsgNotifPaused: function (to) {
        'use strict';
        this.eventsMng.getStatus(to, function (u){
            if (u.status !== App.Consts.STATUS_OFFLINE && u.status !== App.Consts.STATUS_UNAUTH) {
        this.eventsMng.sendMsgNotif(to, 'paused');
            }
        }, this);
    },

    /**
     * sendMsgNotifCompos
     */
    sendMsgNotifCompos: function (to) {
        'use strict';
        this.eventsMng.getStatus(to, function (u){
            if (u.status !== App.Consts.STATUS_OFFLINE && u.status !== App.Consts.STATUS_UNAUTH) {
        this.eventsMng.sendMsgNotif(to, 'composing');
            }
        }, this);
    },

    /**
     * displayMsgNotif
     */
    displayMsgNotif: function (id, from) {
        'use strict';
        if (this.model.getMsgCount() > 0) {
            if (this.userJID !== from) {
                // will display notif and resolve name of user
                var name = this.eventsMng.getContact(from, function (name) {
                    this.model.addTypingToStore(from, name);
                    this.view.updateScrollBars(true);
                    this.view.msgSendForm.focus();
                }, this);
            }
        }
        this.model.sortMsgInStore();
    },

    /**
     *
     */
    displayMsgWin: function (title, msg, cb, scope) {
        'use strict';
        this.eventsMng.fireEvent('display-notif-win', title, msg);
    },

    /**
     *
     */
    removeMsgNotif: function (id, from) {
        'use strict';
        // remove typing notif
        //App.Log.logd('removeMsgNotif ' + from + ' id ' + id );
        this.model.removeTypingFromStore(from, true);
        this.model.sortMsgInStore();
        this.view.updateScrollBars(true);
    },

    /**
     * removeSystemMsgs
     */
    removeSystemMsgs: function () {
        'use strict';
        this.model.removeSystemMsgs();
    },

    /**
     * removeSystemMsgs
     */
    removeMsgs: function () {
        'use strict';
        this.model.removeMsgs();
    },

    /**
     * replaceLongMsg
     * @param {string} m - message
     * @param {number} w - width of panel, symbol count
     */
    replaceLongMsg: function (m, w) {
        'use strict';
        var str = '', i = 0;
        if (w !== null) {
            if (m.length > w) {
                while (i <= m.length) {
                    str += m.substring(i, w + i) + ' ';
                    i += w;
                }
            } else {
                str = m;
            }
        } else {
            str = m;
        }

        return str;

    },

    /**
     *
     */
    replaceLinks: function (message) {
        'use strict';
        var _this = this, reg = /(https{0,1}:\/\/www\.[^ ]+)/ig;
        if (reg.test(message)) {
            message = message.replace(reg, function (m) {
                return '<a href="' + m + '" target="_blank">' + m + '</a>';
            }, _this);
            return message;
        }

        reg = /(https{0,1}:\/\/[^ ]+)/ig;
        if (reg.test(message)) {
            message = message.replace(reg, function (m) {
                return '<a href="' + m + '" target="_blank">' + m + '</a>';
            }, _this);
            return message;
        }

        //@TODO
        reg = /(www\.[^ ]+\.[a-z]{2,3})/ig;
        if (reg.test(message)) {
            message = message.replace(reg, function (m) {
                return '<a href="http://' + m + '" target="_blank">' + m + '</a>';
            }, _this);
            return message;
        }

        return message;
    },

    /**
     * @from jid of user
     */
    displayMessage: function (from, msgOrig, msgDate, fromHistory) {
        'use strict';
        App.Log.logd('chat controller displayMessage ' + ' from ' + from + ' msg ' + msgOrig + ' date ' + msgDate);

        // display message in textarea box
        if (!msgDate) {
            msgDate = new Date();
        }

        if (from) {
            var msg = App.Main.htmlspecialchars(msgOrig), name;
            msg = this.replaceLinks(msg);

            from = from.toLowerCase();

            // remove typing notif
            this.model.removeTypingFromStore(from);

            // resolve name of user
            name = this.eventsMng.getContact(from, function (name) {
                this.model.addMsgToStore({
                    from : from,
                    name : name,
                    msg : msg,
                    date : msgDate,
                    fromHistory : fromHistory,
                    userJID : this.userJID
                });
                this.msgsCount += 1;
                //insert to history
                if (!fromHistory) {
                    App.Prefs.saveHistoryChatMsg(this.chatID, from, name, msgDate, msgOrig);
                }
                //shift the scroll bar down
                this.lastMsgDate = msgDate;
            }, this);
        }

    },

    /**
     * display system messages
     * @param string msgOrig
     * @param bool hideDate
     */
    displaySystemMessage : function (msgOrig, hideDate) {
        'use strict';
        this.model.addMsgToStore({
            from : 'system',
            name : 'system',
            msg : msgOrig,
            date : new Date(),
            fromHistory : false,
            hideDate : hideDate
        });
        this.view.updateScrollBars(true);
        // this.view.chatbox.el.dom.scrollTop = this.view.chatbox.el.dom.scrollHeight;
    },

    /**
     * after client load we can recive offline msg,
     * in eventMng we create the chat controller and panel,
     * need to dislay this msgs after history
     */
    displayDelayedMsgs: function () {
        'use strict';
        App.Log.logd(' -### displayDelayedMsgs');
        if (!this.dTask) {
            this.dTask = new Ext.util.DelayedTask(function () {
                App.Log.logd(' -### this.dTask displayDelayedMsgs historyLoaded ' + this.historyLoaded);
                // App.Log.logd(this.dMsgs); this.historyLoaded &&
                if (this.dMsgs) {
                    this.dMsgs.each(function (item) {
                        App.Log.logd(' -### displayDelayedMsgs ' + item.msg);
                        var date = item.date;
                        date = new Date((date.format("U") - this.eventsMng.xmpp.timeDiff) * 1000);
                        this.displayMessage(item.from, item.msg, date);
                    }, this);
                    this.view.updateScrollBars(true);
                    this.dTask.cancel();
                    this.dMsgs = false;
                    this.dTask = false;
                } else {
                    // if history not loaded yet, bat we have delayed msgs
                    if (this.dMsgs) {
                        this.dTask.delay(500);
                    } else {
                        this.dTask.cancel();
                        this.dTask = false;
                    }
                }
            }, this);
            this.dTask.delay(500);
        }
    },

    /**
     *
     */
    storeDelayedMsgs: function (from, msg, date) {
        'use strict';
        App.Log.logd(' - storeDelayedMsgs ' + from + ' - ' + msg + ' d ' + date);
        if (!this.dMsgs) {
            this.dMsgs = new Ext.util.MixedCollection();
            this.dMsgsCount = 0;
        }
        this.dMsgs.add(this.dMsgsCount, {
            'from' : from,
            'msg' : msg,
            'date' : date
        });
        this.dMsgsCount += 1;
        this.displayDelayedMsgs();
    },

    /**
     * addUser
     * event from xmpp, user was joined to chat conf
     */
    joinUser : function (chatId, userJID) {
        'use strict';
        var jid = userJID;
        this.eventsMng.getContact(jid, function (name, status) {
            this.view.usersList.setActiveUser(jid, name);
            this.view.usersList.setStatus(jid, status);
            this.displaySystemMessage(App.Lang.getStr('User') + ' <span class="wgc-chat-system-msg-user">' + name + '</span> ' + App.Lang.getStr('joined to the conference'));
        }, this);
    },

    /**
     * removeUser
     */
    removeUser: function (chatId, userJID) {
        'use strict';
        var jid = userJID;
        this.eventsMng.getContact(jid, function (name) {
            this.view.usersList.setInactiveUser(jid, name);
            this.removeMsgNotif(chatId, jid);
            this.displaySystemMessage(App.Lang.getStr('User') + ' <span class="wgc-chat-system-msg-user">' + name + '</span> ' + App.Lang.getStr('left the conference'));
        }, this);
    },

    /**
     * deleteUserFromConf
     */
    deleteUserFromConf: function (id) {
        'use strict';
        this.eventsMng.delUserFromConf(this.chatID, id);
    },

    /**
     * addUsersToChat
     * event from view
     * with list of new users
     */
    addUsersToChat: function (jids, names) {
        'use strict';
        if (this.isConference()) {
            if (this.isModerator()) {
                this.eventsMng.registerChatroomMembers(this.chatID, jids);
            }
        } else {
            //convert chat to conference, send all list of users
            this.chatUsers = [];
            Ext.each(jids, function (u) {
                this.chatUsers.push(u);
            }, this);
            this.chatUsers.push(this.chatID); // add jid of chat user
            names.push(this.chatName); // add name of single chat user
            this.eventsMng.convertChatToChatroom(this.chatID, this.chatUsers, names);
        }
    },

    /**
     * will parse results and add to msgs view
     */
    parseHistoryResults : function (items) {
        'use strict';
        Ext.each(items, function (item) {
            if (item.chat_id === this.chatID) {
                if (item.msgs) {
                    var msgs = Ext.decode(item.msgs);
                    Ext.each(msgs, function (m) {
                        //App.Log.logd('#jid ' + item.from_jid + ' m: ' + m.msg + ' d ' + Date.parseDate(m.date, "Y-m-dTg:i:s"));
                        this.displayMessage(item.from_jid, m.msg, Date.parseDate(m.date, "c"), true);
                        //fromHistory=true
                    }, this);
                    this.view.updateScrollBars(true);
                }
            }
        }, this);
    },

    /**
     * onAddUser
     */
    onAddUser: function (id) {
        'use strict';
        return this.addUsersToChat([id]);
    },

    /**
     * onRemoveUser from users list
     */
    onRemoveUser: function (id) {
        'use strict';
        this.deleteUserFromConf(id);
    },

    /**
     * event from view
     */
    onChatFinish: function () {
        'use strict';
        if (!this.isDestroyed) {
            if (this.isConference()) {
                if (this.isModerator()) {
                    this.eventsMng.destroyConf(this.chatID);
                } else {
                    this.eventsMng.leaveConf(this.chatID);
                }
                this.setFinished();
            }
        }
    },

    /**
     * event from view
     */
    onConfCreate: function () {
        'use strict';
        this.eventsMng.checkConf(this.chatID, function (exists) {
            this.removeMsgs();
            this.setActive(true);
            if (exists) {
                this.removeAllUsers();
                this.eventsMng.joinConf(this.chatID);
            } else {
                this.displaySystemMessage(App.Lang.getStr('Creating new conference.'), true);
                this.removeAllUsers();
                // @TODO restart chat by hid
                this.eventsMng.reStartChat(this.chatID, this.chatType);
            }

        }, this);

    },

    /**
     * event from view
     */
    onConfEnter: function () {
        'use strict';
        //App.Log.logd('onConfEnter ' + this.chatID + ' ' + this.chatUsers);
        this.eventsMng.checkConf(this.chatID, function (exists) {

            if (exists) {
                this.removeMsgs();
                // this.historyLoaded = false;
                // this.loadLastMsgs();
                this.removeAllUsers();
                var date = new Date();
                if (this.lastMsgDate) {
                    date = this.lastMsgDate;
                }
                this.eventsMng.joinConf(this.chatID, date);
                this.setActive(true);
            } else {
                this.displaySystemMessage(App.Lang.getStr('This conference no longer exists.'), true);
                this.setActive(false);
                this.view.showEnterButton(false);
            }
        }, this);
    },

    /**
     * user is online
     */
    onUserStatus: function (from, show, status) {
        'use strict';
        // @TODO add event to usersMng UsersMng.js
        if (show === App.Consts.STATUS_OFFLINE) {
            this.removeMsgNotif(this.chatID, from);
        }
        this.view.usersList.setStatus(from, show);
    },

    /**
     * onNameResolved event from eventMng
     * @param  {String} jid
     * @param  {String} name
     * @param  {String} status
     */
    onNameResolved: function(jid, name, status){
        if (name){
            if (this.isConference()){
                var i = this.chatName.indexOf(jid);
                if (~i){
                    this.chatName[i] = name;
                }
            } else {
                if (App.Main.isJid(this.chatID) && this.chatID === jid){
                    this.chatName = name;
                }
            }
            this.setTbTitle();
        }
    },

    /**
     *
     */
    onSearchInHistoryStart: function (startDate, endDate) {
        'use strict';
        //we get end date with time 00:00:00
        var firstMsg = this.model.findFirstMsgInStore(),
            firstMsgDate = false,
            date,
            a = ( endDate.format('U') + 24*60*60 - 1 ),
            dt = Date.parseDate(a, "U");

        if (firstMsg) {
            firstMsgDate = firstMsg.date.format('U');
        }
        endDate = dt;
        // calculate timezone offset
        if (firstMsgDate) {
            if (a > firstMsgDate) {
                endDate = firstMsg.date;
            }
        }

        date = {
            start : startDate,
            end : endDate
        };

        App.Prefs.loadHistoryChatMsgByDate(this.chatID, date, this.onSearchInHistoryResults, this);
    },

    /**
     *
     */
    onSearchInHistoryResults: function (items) {
        'use strict';
        if (items) {
            this.model.removeHistoryMsgsFromStore();
            this.parseHistoryResults(items);
            this.model.sortMsgInStore();
        } else {
            App.Log.logd(' onSearchInHistoryResults null result');
        }

    },

    /**
     *
     */
    onFilternHistoryStart: function (value) {
        'use strict';
        if (value) {
            this.model.filterMsgsInStore(value);
        } else {
            this.model.sortMsgInStore();
        }
    },

    /**
     * errorLog
     */
    errorLog: function (err) {
        'use strict';
        App.Log.logd(err);
    }
});
