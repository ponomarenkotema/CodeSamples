/*---------------------
    :: Cameras
    -> controller
---------------------*/
var r = require('./classes/respGen'),
    response = new r(),
    allowedArg = [
        'active',
        'name',
        'url'
    ],
    allowedData = [
        'id',
        'name',
        'source',
        'uri',
        'type',
        'method',
        'port',
        'active'
    ],
    async = require('async');




var CamerasController = {


    create: function (req, res) {
        'use strict';
        if (response.isAuth(req, res)) {

            var url = req.param('url'),
                name = req.param('name');

            if (!url || !name){
                return response.sendError(res, response.Errors.INVALID_PARAMS);
            }

            Cameras.find({
                userId: req.session.passport.user.id,
                url: url
            }).done(function(err, items) {

                if (err) {
                    response.sendError(res, response.Errors.SERVER_ERROR, err);
                }

                if (!items){
                    Cameras.create({
                        userId: req.session.passport.user.id,
                        name: name,
                        url: url
                    }).done(function(err, item) {

                        if (err) {
                            response.sendError(res, response.Errors.SERVER_ERROR, err);
                        } else {
                            response.sendResponse(res, item);
                        }
                    });
                } else {
                    return response.sendError(res, response.Errors.DUPLICATED_RECORD, err);
                }
            });

        }

    },

    destroy: function (req,res) {
        'use strict';
        var id = false;


        if (response.isAuth(req, res)) {
            id = req.param('id');

            if (!id){
                return response.sendError(res, response.Errors.INVALID_PARAMS);
            }

            Cameras.destroy({id:id}, function(err) {

                if (err) {
                    response.sendError(res, response.Errors.SERVER_ERROR, err);
                } else {
                    response.sendResponse(res, {});
                }
            });
        }
    },

    find: function (req, res) {
         'use strict';
        if (response.isAuth(req, res)) {
            var id = false;

            Cameras.findAll({userId: req.session.passport.user.id}).done(function(err, items) {

                if (err) {
                    response.sendError(res, response.Errors.SERVER_ERROR, err);
                } else {
                    var data = [];
                    _.each(items, function(item){
                          data.push(item.values);
                    });
                    response.sendResponse(res, data);
                }
            });
          }

    },





    _findPolygons: function(id, cb){
        'use strict';
        var polygons = [],
            me = this;


        Polygons.findAll({
            cameraId: id
        }).done(function(err, items) {

            if (err) {
                cb(err);
            } else {
                var tmp = [],
                    objToAdd;
                // parsing polygons
                _.each(items, function(item){
                    tmp = JSON.parse(item.points);
                    objToAdd = {
                        data: [],
                        id: item.id,
                        type: 'non-sensible'
                    };
                    _.each(tmp.points, function(polygon){
                        objToAdd.data.push({x: polygon.left, y: polygon.top});
                        // objToAdd.data.push({x: polygon.left - tmp.shift.x, y: polygon.top - tmp.shift.y});
                    });
                    polygons.push(objToAdd);
                });

                cb(null, polygons);
            }
        });
    },

    /**
     * this method only to use as service api
     */
    findCam: function (req, res) {
         'use strict';
        var id = req.param('id'),
            results = [],
            obj = {active: 1};

            if (id){
                obj.id = id;
            }

        Cameras.findAll(obj).done(function(err, items) {

            if (err) {
                response.sendError(res, response.Errors.SERVER_ERROR, err);
            } else {

                async.map(
                    items,
                    function(item, callback){
                        var camera = {};

                        _.map( item, function(value, key){
                            if (_.contains(allowedData, key)){
                                // @TODO parse
                                if (key === 'active'){
                                    key = 'enabled';
                                    value = value ? true : false;
                                }
                                camera[key] = value;
                            }
                        });

                        CamerasController._findPolygons(item.id, function(err, p){
                            // console.log('polygons for ' + item.id + ' name ' + item.name + ' l ' +  p.length, p);
                            if (err){
                                return response.sendError(res, response.Errors.SERVER_ERROR, err);
                            }
                            camera.polygons = p;
                            results.push(camera);
                            // console.log('** ###', camera);
                            callback(err, camera);
                        });

                    },
                    function(err, result){
                        console.log('results ', results);
                        if (err){
                            return response.sendError(res, response.Errors.SERVER_ERROR, err);
                        }
                        response.sendResponse(res, results);
                    }
                );
            }
        });

    },




    update: function (req, res) {
        'use strict';
        var id = req.param('id'),
            obj = {};

            if (response.isAuth(req, res)) {

            if (!id && !req.body){
                return response.sendError(res, response.Errors.INVALID_PARAMS);
            }

            _.map( req.body, function(value, key){
                if (_.contains(allowedArg, key)){
                    obj[key] = value;
                }
            });

            if (_.isEmpty(obj)){
                return response.sendError(res, response.Errors.PARAMS_TO_UPDATE_NOT_SET);
            }

            Cameras.update({
                userId: req.session.passport.user.id,
                id: id
            }, obj, function(err) {
                if (err) {
                    response.sendError(res, response.Errors.SERVER_ERROR, err);
                } else {
                    response.sendResponse(res, {});
                }
            });
        }
    }

};
module.exports = CamerasController;