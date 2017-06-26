//set up===========================
var request = require('request');
var moment = require('moment');
var _ = require("underscore");
var md5 = require('md5');
var _config = require('./config');
var _rsync = require('./rsync');
//var EN_data = require(_config.locale+ "en_US.json");
//var CN_data = require(_config.locale + "zh_CN.json");
var mysql = require('promise-mysql');
var express = require('express');
var mkdirp = require('mkdirp');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var bluebird = require('bluebird');
var fs = bluebird.promisifyAll(require('fs'));
var session = require("express-session");
var app = module.exports = express.Router();
app.use(session({ secret: 'keyboard cat'}));
app.use(cookieParser());

var log4js = require('log4js');
log4js.configure({
    appenders: [
        {type: 'console'},//控制台输出
        {
            type:'file',//文件输出
            filename:'logs/user.log',
            maxLogSize:20480,
            backups:10,
            category:'normal'
        }
    ]
});
var logger = log4js.getLogger('normal');
logger.setLevel('ERROR');
app.use(log4js.connectLogger(logger, {level:log4js.levels.INFO, format:':method :url'}));
var parser = bodyParser.urlencoded({ limit: '50mb', extended: false });
// create a connection to the mysql----------------
var pool = mysql.createPool({
	connectionLimit: 100,
	host: _config.sql_host,
	user: _config.sql_user,
	password: _config.sql_password,
	database: _config.sql_database,
	debug: false
});

function getTag(req) {
    return _.pick(req.body, 'id', 'Name', 'CN', 'EN', 'Field', 'Company', 'Version');
}

/**
 * 用于在浏览器端下载语言文件（暂未使用）
 * @param filename
 * @param data
 * @param res
 */
function download(filename, data, res) {
    fs.writeFile(_config.publish_path + _config.locale + filename, JSON.stringify(data), function(error){
        if (error) {
            return res.json({code: 100, message: 'Download:' + error});
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats');
        res.setHeader("Content-Disposition", "attachment; filename=" + filename);
        res.download(_config.publish_path + _config.locale + filename, filename, function(error) {
            res.end();
        })
    });
}

/**
 * 用于在浏览器端下载语言文件（暂未使用）
 * @param req
 * @param res
 * @param con
 * @returns {Function}
 */
function doExport(req, res, con) {
    return function(error, result) {
        var en = {},
            cn = {},
            conf = {
                cn: {
                    file: 'zh_CN.json',
                    data: cn
                },
                en: {
                    file: 'en_US.json',
                    data: en
                }
            },
            data = conf[req.params.lan] || conf.cn;

        if (error) {
            console.error(error);
            return res.status(404, error);
        }

        _.each(result, function(data) {
            en[data.Name] = data.EN;
            cn[data.Name] = data.CN;
        });

        download(data.file, data.data, res);
        con && con.connection.release();
    }
}

/**
 * 发布语言文件
 * @param req
 * @param res
 * @param con
 * @param version
 * @returns {Function}
 */
function doPublishProduct(req, res, con, version) {
    return function(error, result) {
        //console.log('===============',error[1]);
        //APIERRORCode的发布流程需要更改
        if(req.body.product === 'APIErrorCode') {
            var greyId = error[1];
            var Company = req.body.Company ? req.body.Company : 'ucloud';
            var localeMD5Code = md5(JSON.stringify(error[0]));
            //var filePath = _config.publish_path + _config.locale + Company + '_' + req.body.product + '/';
            var filePath = _config.publish_path + _config.locale + Company + '_' + 'errorcode' + '/' + version + '/' + localeMD5Code + '/';
            var en = {},
                cn = {},
                conf = {
                    cn: {
                        file: filePath + 'zh_CN.json',
                        cmd : _config.publish_path,
                        path : _config.locale + Company + '_' + 'errorcode' + '/' + version + '/' + localeMD5Code + '/',
                        data: cn
                    },
                    en: {
                        file: filePath + 'en_US.json',
                        cmd : _config.publish_path,
                        path : _config.locale + Company + '_' + 'errorcode' + '/' + version + '/' + localeMD5Code + '/',
                        data: en
                    }
                };
            var dataCn;
            var dataEn;
            _.each(error[0], function(data) {
                en[data.id] = data.en;
                cn[data.id] = data.zh;
            });
            dataCn = conf.cn;
            dataEn = conf.en;

            isExistInSql(version, greyId).then(updateSql).then(writeSql).then(readSql).then(function (results) {
                mkdirp.sync(filePath);
                con && con.connection.release();
                var redisResults = _.indexBy(results,'GreyId');
                _.each(redisResults, function(item) {
                    item.path = _config.locale;
                });
                publish(JSON.stringify(redisResults));
            }).catch(function (err) {
                res.json({code: 83, message: '发布失败' + err});
            });

            // try{
            //     mkdirp.sync(_config.publish_path + _config.locale + Company + '_' + req.body.product + '/');
            // }catch(e) {
            //     res.json({code: 83, message: '创建文件夹失败' + err});
            // }
            // con && con.connection.release();
            // Promise.all([produceJsonFile(dataCn.file, dataCn.data), produceJsonFile(dataEn.file, dataEn.data)]).then(function (results) {
            //     res.json({code: 0, message: '发布成功'});
            // }, function (err) {
            //     res.json({code: 100, message: '发布失败' + err});
            // });
        }else {
            var Company = req.body.Company ? req.body.Company : 'ucloud';
            //修改将原路径改写成每次导入内容的md5码 md5(JSON.stringify(result));
            var localeMD5Code = md5(JSON.stringify(result));
            //var filePath = _config.publish_path + _config.locale + Company + '_' + req.body.product + '/' + req.body.GreyId + '/';
            var filePath = _config.publish_path + _config.locale + Company + '_' + req.body.product + '/' + version + '/' + localeMD5Code + '/';
            var en = {},
                cn = {},
                conf = {
                    cn: {
                        file: filePath + 'zh_CN.json',
                        cmd : _config.publish_path,
                        path : _config.locale + Company + '_' + req.body.product + '/' + version + '/' + localeMD5Code + '/',
                        data: cn
                    },
                    en: {
                        file: filePath + 'en_US.json',
                        cmd : _config.publish_path,
                        path : _config.locale + Company + '_' + req.body.product + '/' + version + '/' + localeMD5Code + '/',
                        data: en
                    }
                };
            var dataCn;
            var dataEn;
            if (error) {
                console.error(error);
                return res.status(404, error);
            }

            _.each(result, function(data) {
                en[data.Name] = data.EN;
                cn[data.Name] = data.CN;
            });
            dataCn = conf.cn;
            dataEn = conf.en;

            isExistInSql(version, req.body.GreyId).then(updateSql).then(writeSql).then(readSql).then(function (results) {
                mkdirp.sync(filePath);
                con && con.connection.release();
                var redisResults = _.indexBy(results,'GreyId');
                _.each(redisResults, function(item) {
                    item.path = _config.locale;
                });
                publish(JSON.stringify(redisResults));
            }).catch(function (err) {
                res.json({code: 83, message: '发布失败' + err});
            });
        }

        function produceJsonFile(filename, data) {
            return fs.writeFileAsync(filename, JSON.stringify(data));
        }

        function syncRedis(value) {
            return new Promise(function (resolve, reject) {
                request.post({
                    url: 'http://' + _config.redis_ip + ':' + _config.redis_port + '/redis/writeRedis',
                    headers: {
                        'x-forwarded-user': 'locale-sys'
                    },
                    form: {
                        key: 'localeVersion',
                        value: value
                    }
                }, function(err,res,body) {
                    if(err)
                        reject(err);

                    resolve(body);
                })
            })
        }

        //判断locale_version(_config.sql_publish_table)表中是否存在已经发布的Key
        function isExistInSql(Version, GreyId) {
            var sql = 'SELECT id FROM ' + _config.sql_publish_table + ' WHERE GreyId= ? LIMIT 1';
            console.log(sql);
            return con.query(sql, [GreyId]);
        }

        //用于更新数据库中的key，如果value不存在则不更新，如果存在则更新，value[0].id为当前数据对应的id
        //todo 这里的逻辑比较简单，数据库中的GreyId是唯一的
        function updateSql(value) {
            if(value.length) {
                console.log(value[0].id)
                var sql = 'UPDATE ' + _config.sql_publish_table + ' SET CreateTime = ?,IsValid = ?,Version = ?,MD5 = ? WHERE id = ? ';
                console.log(sql);
                return con.query(sql, [moment().unix(), true, version, localeMD5Code, value[0].id]);
            } else {
                return new Promise(function (resolve, reject) {
                    resolve('insert');
                })
            }
        }

        //往数据库中插入新值，如果value等于insert，则不需要插入
        function writeSql(value) {
            console.log(value);
            if(value === 'insert'){
                var sql = 'INSERT INTO ' + _config.sql_publish_table + ' SET ?';
                console.log(sql);
                return con.query(sql, [{Product: req.body.product, Company: Company, Version: version, CreateTime: moment().unix(), GreyId: req.body.GreyId || greyId, IsValid: true,MD5:localeMD5Code}]);
            }else {
                return new Promise(function (resolve, reject) {
                    resolve('exist');
                })
            }
        }

        function readSql(){
            var sql = 'SELECT GreyId,Version,Company,MD5 FROM ' + _config.sql_publish_table;
            console.log(sql);
            return con.query(sql);
        }

        function publish(value) {
            Promise.all([produceJsonFile(dataCn.file, dataCn.data), produceJsonFile(dataEn.file, dataEn.data)]).then(function (results) {
            //Promise.all([produceJsonFile(dataCn.file, dataCn.data), produceJsonFile(dataEn.file, dataEn.data)]).then(function (results) {

                console.log(results);
                _rsync(_config.servers || [],{
                    path:dataCn.path,
                    cmd : dataCn.cmd
                }).then(function(){
                    "use strict";
                    syncRedis(value).then(function(data){
                        if(JSON.parse(data).code == 0){
                            console.log({code: 0, message: '发布成功'},'===========发布结束')
                            res.json({code: 0, message: '发布成功'});
                        }else{
                            res.json({code: 83, message: '发布失败同步redis失败'+data});
                        }
                    }).catch(function(){
                        res.json({code: 83, message: '发布失败redis失败,网络或接口异常'});
                    });
                }).catch(function(error){
                    "use strict";
                    res.json({code: 83, message: '发布失败同步失败'+error});
                });
            }, function (err) {
                res.json({code: 100, message: '发布失败' + err});
            })
        }
    }
}

/**
 * 错误处理
 */
function handelError(id, err, res, command) {
    var error;
    switch (id) {
        case 81:
            error = {
                code:81,
                message:"数据库连接失败" + err
            };
            logger.error(JSON.stringify(error));
            res.json(error);
            break;
        case 82:
            error = {
                code:82,
                message:"查找数据库失败" + err
            };
            logger.error(JSON.stringify(error));
            res.json(error);
            break;
        case 100:
            error = {
                code: 100,
                message:command + err
            };
            logger.error(JSON.stringify(error));
            res.json(error);
            break;
        case 90:
            error = {
                code: 90,
                message:err
            };
            logger.error(JSON.stringify(error));
            res.json(error);
            break;
        case 91:
            error = {
                code: 91,
                message:"创建产品失败" + err
            };
            logger.error(JSON.stringify(error));
            res.json(error);
            break;
        case 92:
            error = {
                code: 92,
                message:"发布API错误码失败" + err
            };
            logger.error(JSON.stringify(error));
            res.json(error);
            break;
    }
}

function readProductFromGrey() {
    return new Promise(function (resolve, reject) {
        request.post({
            url: 'http://' + _config.redis_ip + ':' + _config.redis_port + '/productall/list',
            headers: {
                'x-forwarded-user': 'locale-sys'
            }
        }, function(err,res,body) {
            if(err)
                reject("读取灰度列表产品失败" + err);

            var data = JSON.parse(body);
            if(data && data.code !== 0)
                reject("读取灰度列表产品失败" );
            var products = [];
            _.each(data.data, function(item) {
                products.push(item['p_name']);
            });
            //products.push('locale');
            resolve(products);
        })
    })
}

function readProductFromDatabase(con, req) {
    var database = req.body.database ? req.body.database : _config.sql_database;
    var sql = 'SHOW TABLES FROM ' + database;
    console.log(sql);
    return new Promise(function (resolve, reject) {
        con.query(sql).then(function (result) {
            var key = 'Tables_in_' + _config.sql_database;
            var data = [];
            _.each(result, function (item) {
                item[key] !== _config.sql_publish_table && data.push(item[key]);
            });
            resolve(data);
        }).catch(function(err) {
            reject("查询数据库产品列表失败" + err);
        });
    })
}

function queryCommand(command, value, req, res, product_locale) {
    var con;

    function callback(error, result) {
        con && con.connection.release();
        if (_.isObject(error) || error) {
            return handelError(100, error, res, command);
        }
        var data = {
            code: 0,
            data: result
        };
        res.json(data);
    }

    function readProductsCallback(error, key, result, keys) {
        var data = [];
        if (!keys) {
            _.each(result, function (item) {
                item[key] !== _config.sql_publish_table && data.push(item[key]);
            });
            //productLists = data;
        } else {
            var dataObj = {};
            _.each(result, function (item) {
                _.each(keys, function (key) {
                    dataObj[key] = item[key];
                });
                dataObj.Version !== 'temp' && data.push(_.clone(dataObj));
            });
        }
        callback(error, data);
    }

    function findNewVersion(req) {
        var Company = req.body.Company ? req.body.Company : 'ucloud';
        var Version = 'temp';
        var sql = 'SELECT Version FROM ' +  req.body.product + ' WHERE Date = (SELECT MAX(Date) from ' + req.body.product + ' WHERE Company= ? AND Version!= ?) LIMIT 1';
        console.log(sql);
        return con.query(sql, [Company, Version]);
    }

    //todo Company目前是模拟req.body获取的，最终是需要改成在cookie中获取
    //todo 注意用户登录的时候，Company的纬度就已经唯一确定下来了
    function excute(command, callback){
        switch (command) {
            case 'locale/import':
                var Company = req.body.Company ? req.body.Company : 'ucloud';
                var Version = req.body.Version ? req.body.Version : 'temp';
                return queryKeysFromSql().then(writeIntoSql).then(function (value) {
                    res.json({code: 0, message: JSON.stringify(value)});
                }).catch(function (err) {
                    res.json({code: 100, message: JSON.stringify(err)});
                });

                function writeIntoSql(keys) {
                    var deferlists = [];
                    _.each(value, function(item) {
                        if(_.indexOf(keys, item[0]) >= 0) {
                            console.log('exist');
                        } else {
                            var sql = 'INSERT INTO ' + product_locale + ' SET ?';
                            console.log('not exist');
                            deferlists.push(con.query(sql, [{Name: item[0], CN: item[1], EN: item[2], Company: Company, Version: Version, CreateTime: moment().unix(), IsPublish: false}]));
                        }
                    });
                    return new Promise(function (resolve, reject) {
                        Promise.all(deferlists).then(function (value) {
                            resolve(value);
                        }).catch(function (err) {
                            reject('[导入数据库失败]' + err);
                        })
                    });
                }

                function queryKeysFromSql() {
                    var sql = 'SELECT Name FROM ' + product_locale + ' WHERE Company = ? AND Version= ? ';
                    console.log(sql);
                    return new Promise(function (resolve, reject) {
                        con.query(sql, [Company, Version]).then(function (keysSql) {
                            var keys = [];
                            _.each(keysSql, function(item) {
                                keys.push(item['Name'])
                            });
                            resolve(keys);
                        }).catch(function(err) {
                            reject('读取数据库失败' + err);
                        })
                    })
                }
            case 'locale/export':
                var sql = 'SELECT Name,CN,EN FROM ' + req.body.product;
                console.log(sql);
                return con.query(sql, doExport(req, res, con));
            case 'locale/createNewProduct':
                //data[0]为灰度表中的产品列表，data[1]为数据库中的产品列表
                return Promise.all([readProductFromGrey(), readProductFromDatabase(con, req)]).then(function(data) {
                    var deferList = [];
                    _.each(data[0], function(product) {
                        if( _.indexOf(data[1], product) < 0 ) {
                            var sql = 'CREATE TABLE ' + product + '(id int auto_increment PRIMARY KEY, Name varchar(50) NOT NULL, CN TEXT, EN TEXT, Field varchar(200), Company varchar(50), Version varchar(200), Date int, CreateTime int, Remark varchar(200), IsPublish BOOL, GreyId varchar(200), produceRemark varchar(200)) ENGINE=InnoDB DEFAULT CHARSET=utf8;'
                            console.log(sql);
                            deferList.push(con.query(sql));
                        }
                    });
                    Promise.all(deferList).then(function (value) {
                        res.json({code: 0, data: '成功'})
                    }).catch(function (err) {
                        handelError(91, err, res)
                    });
                }).catch(function(err) {
                    handelError(90, err, res)
                });
            case 'locale/drop':
                //todo 删除产品的思路，应该是删除当前产品下对应公司的产品（慎用）
                var sql = 'DROP TABLE ' + req.body.product;
                console.log(sql);
                return con.query(sql, callback);
            case 'locale/query':
                var Company = req.body.Company ? req.body.Company : 'ucloud';
                var Version = req.body.Version ? req.body.Version : 'temp';
                var sql = 'SELECT * FROM ' + req.body.product + ' WHERE Company = ? AND Version= ? ORDER BY CreateTime';
                console.log(sql);
                return con.query(sql, [Company, Version], callback);
            case 'locale/insert':
                var data = _.clone(value);
                //TODO 改成从cookie中获取Company
                data.Company = req.body.Company ? req.body.Company : 'ucloud';
                data.Version = req.body.Version ? req.body.Version : 'temp';
                var sql = 'INSERT INTO ' + req.body.product + ' SET ?';
                console.log(sql);
                logger.fatal(req.session.name + " ADD: " + JSON.stringify(value));
                return con.query(sql, [_.extend({}, data, {CreateTime: moment().unix(), IsPublish: false})], callback);
            case 'locale/update':
                var Company = req.body.Company ? req.body.Company : 'ucloud';
                var sql = 'UPDATE ' + req.body.product + ' SET CN = ?,EN = ?,Field = ?,Company = ?,CreateTime = ?,IsPublish = ? WHERE id = ? AND Name = ? ';
                console.log(sql);
                logger.fatal(req.session.name + " UPDATE: " + JSON.stringify(value));
                return con.query(sql, [value.CN, value.EN, value.Field, Company, moment().unix(), false, value.id, value.Name], callback);
            case 'locale/delete':
                var sql = 'DELETE FROM ' + req.body.product + ' WHERE id = ?';
                console.log(sql);
                logger.fatal(req.session.name + " DELETE: " + JSON.stringify(value));
                return con.query(sql, [value.id], callback);
            case 'locale/readProducts':
                var database = req.body.database ? req.body.database : _config.sql_database;
                var sql = 'SHOW TABLES FROM ' + database;
                console.log(sql);
                return con.query(sql).then(function (result, error) {
                    var key = 'Tables_in_' + _config.sql_database;
                    readProductsCallback(error, key, result);
                });
            case 'locale/hasSimilarName'://返回的result长度大于1，说明存在
                var Company = req.body.Company ? req.body.Company : 'ucloud';
                var Version = req.body.Version ? req.body.Version : 'temp';
                var sql = 'SELECT 1 FROM '+ req.body.product + ' WHERE Company= ? AND Version= ? AND Name= ? LIMIT 1';
                console.log(sql);
                return con.query(sql, [Company, Version, value.Name], callback);
            case 'locale/hasTemp'://返回的result长度大于1，说明存在
                var Company = req.body.Company ? req.body.Company : 'ucloud';
                var Version = req.body.Version ? req.body.Version : 'temp';
                var sql = 'SELECT 1 FROM '+ req.body.product + ' WHERE Company= ? AND Version= ? LIMIT 1';
                console.log(sql);
                return con.query(sql, [Company, Version], callback);
            case 'locale/copyNewToTemp'://复制最新的版本至temp版本
                function copyNewToTemp(version) {
                    var sql = 'INSERT INTO ' + req.body.product + ' (Name,CN,EN,Field,Company,Version,Date) SELECT Name,CN,EN,Field,Company,\'temp\',NULL FROM ' + req.body.product + ' WHERE Version= ?';
                    console.log(sql);
                    con.query(sql, [version], callback);
                }
                return findNewVersion(req).then(function(result) {
                    var version = result[0].Version;
                    console.log(version);
                    copyNewToTemp(version);
                });
            case 'locale/produceNewVersion'://生成新的版本,并且保留temp版本
                function produceNewVersion(version) {
                    var Company = req.body.Company ? req.body.Company : 'ucloud';
                    var Version = req.body.Version ? req.body.Version : 'temp';
                    var produceRemark = req.body.produceRemark ? req.body.produceRemark : ' ';
                    var time = moment().unix();
                    //var sql = 'UPDATE ' + req.body.product + ' SET Version=REPLACE(Version,\'temp\',' + version + '),Date=NOW() WHERE Company= ? AND Version = ?';
                    var sql = 'INSERT INTO ' + req.body.product + ' (Name,CN,EN,Field,Company,Version,Date,CreateTime,Remark,IsPublish,GreyId,produceRemark) SELECT Name,CN,EN,Field,Company,' + version + ',' + time + ',CreateTime,Remark,IsPublish,GreyId,"' + produceRemark + '" FROM ' + req.body.product + ' WHERE Version= ? AND Company= ?';
                    console.log(sql);
                    con.query(sql,[Version, Company], callback);
                }
                return findNewVersion(req).then(function(result) {
                    var version = result.length ? parseInt(result[0].Version) + 1 : 1;
                    console.log(version);
                    //console.log(result[0].Version)
                    produceNewVersion(version);
                });
            case 'locale/publishProduct'://发布当前产品
                function publishProduct(req, version) {
                    var Company = req.body.Company ? req.body.Company : 'ucloud';
                    var sql = 'SELECT Name,CN,EN FROM ' + req.body.product + ' WHERE Company= ? AND Version= ?';
                    console.log(sql);
                    con.query(sql, [Company, version], doPublishProduct(req, res, con, version));
                }
                function updateSql(req, version) {//更新当前发布版本数据的相关信息
                    var Company = req.body.Company ? req.body.Company : 'ucloud';
                    var Remark = req.body.Remark ? req.body.Remark : '';
                    var sql = 'UPDATE ' + req.body.product + ' SET IsPublish = ?,GreyId = ?,Remark = ? WHERE Company= ? AND Version= ?';
                    console.log(sql);
                    //logger.fatal(req.session.name + " UPDATE: " + JSON.stringify(value));
                    return con.query(sql, [true, req.body.GreyId, req.body.Remark, Company, version]);
                }
                if(req.body.product !== 'APIErrorCode') {
                    return findNewVersion(req).then(function (result) {
                        var version = req.body.Version ? req.body.Version : result[0].Version;
                        console.log(version);
                        updateSql(req, version).then(function(result) {
                            publishProduct(req, version);
                        });
                    });
                } else {
                    function readAPIErrorCode() {
                        return new Promise(function (resolve, reject) {
                            request.get({
                                url: "http://192.168.150.179:6200/",
                                json:true
                            }, function(err,res,body) {
                                if(err)
                                    reject("读取API错误码失败" + err);
                                if(body && body.RetCode !== 0)
                                    reject("读取API错误码失败" );
                                var APIData = body.ErrorCodes;
                                resolve(APIData);
                            })
                        })
                    }
                    function readAPIErrorCodeGreyId() {
                        return new Promise(function(resolve, reject){
                                request.post({
                                    url: 'http://' + _config.redis_ip + ':' + _config.redis_port + '/grey/greyInfoByProduct',
                                    headers: {
                                        'x-forwarded-user': 'locale-sys'
                                    },
                                    form: {
                                        p_name: 'errorcode'
                                    }
                                }, function(err,res,body) {
                                    if(err)
                                        reject("读取errorcode灰度ID失败" + err);

                                    console.log(body,"====================")
                                    var data = JSON.parse(body);
                                    if(data && data.code !== 0)
                                        reject("读取errorcode灰度ID失败" );
                                    var greyIdData = _.filter(data.data, function(item) {
                                        return item['is_default'] == true;
                                    });
                                    if(greyIdData && greyIdData[0]['grey_id']) {
                                        resolve(greyIdData[0]['grey_id']);
                                    }
                                    reject("读取errorcode灰度ID失败" );
                                })
                            })
                    }
                    //apierrorcode的版本号固定为1
                    return Promise.all([readAPIErrorCode(),readAPIErrorCodeGreyId()]).then(doPublishProduct(req, res, con, 1)).catch(function(err){
                        console.log(err);
                        handelError(92, err, res)
                    });
                }
            case 'locale/syncLocale'://参数：product,Version,Company
                function syncLocale(req, version) {
                    var companyName = req.body.Company ? req.body.Company : 'ucloud';
                    var versionName = req.body.Version ? req.body.Version : version;
                    var sql = 'SELECT Name,CN,EN FROM ' + req.body.product + ' WHERE Company= ? AND Version= ?';
                    con.query(sql,[companyName, versionName], callback);
                }
                return findNewVersion(req).then(function(result) {
                    var version = result[0].Version;
                    syncLocale(req, version);
                });
            case 'locale/fetchVersions':
                var Company = req.body.Company ? req.body.Company : 'ucloud';
                var sql = 'SELECT DISTINCT Version,Date,IsPublish,Remark,GreyId,produceRemark FROM ' + req.body.product + ' WHERE Company= ? ORDER BY Date';
                console.log(sql);
                return con.query(sql, [Company]).then(function (result, error) {
                    var key = 'Version';
                    var keys = ['Version', 'Date', 'IsPublish', 'Remark', 'GreyId', 'produceRemark'];
                    readProductsCallback(error, key, result, keys);
                });
        }
    }

    pool.getConnection().then(function(connection) {
        con = connection;
        excute(command, callback);
    }).catch(function(err) {
        handelError(81, err, res);
    })

}

var url = /locale\/createNewProduct|locale\/drop|locale\/query|locale\/update|locale\/insert|locale\/delete|locale\/readProducts|locale\/hasSimilarName|locale\/hasTemp|locale\/copyNewToTemp|locale\/produceNewVersion|locale\/publishProduct|locale\/syncLocale|locale\/fetchVersions/;
app.all(url, parser, function(req, res){
    console.log(req.path.slice(1))
    queryCommand(req.path.slice(1), getTag(req), req, res);
});

app.all('/locale/export/:lan',parser, function(req, res) {
    queryCommand('locale/export', getTag(req), req, res);
});

app.all('/locale/import', parser, function (req, res) {
    var values = [];
    var CN_data = JSON.parse(req.body.zh_CN);
    var EN_data = JSON.parse(req.body.en_US);
    var product_locale = req.body.product;

    _.each(CN_data, function(value, key) {
        var find = _.find(values, function(value, index){
            return value[0] === key;
        });

        find? (find[1] = value): values.push([key, value, '', '']);
    });

    _.each(EN_data, function(value, key) {
        var find = _.find(values, function(value, index){
            return value[0] === key;
        });

        find && (find[2] = value);
    });

    console.log(values[0][0]);//values[0][0]为当前语言KEY
    console.log(product_locale)//product_locale为当前语言文件的产品类型

    queryCommand('locale/import', values, req, res, product_locale);
});

/**
 * 程序初次启动时，检测当前数据库中是否含有_config.sql_database,如果没有，则创建，有则跳过。
 * 检测_config.sql_database数据库中，是否含有sql_publish_table表，若没有，则创建，有则跳过。
 */
function init() {
    pool.getConnection().then(function(con) {
        hasDatabase().then(createDatabase).then(hasTable).then(createTable).then(function(value) {
            console.log(value);
            con && con.connection.release();
        });

        function hasDatabase() {
            var sql = 'SHOW DATABASES;';
            return new Promise(function (resolve, reject) {
                con.query(sql).then(function(value) {
                    var databases = [];
                    _.each(value, function(item) {
                        databases.push(item['Database']);
                    });
                    resolve(_.indexOf(databases, _config.sql_database) >= 0);
                }).catch(function(err) {
                    reject('读取数据库失败！' + err);
                })
            });
        }

        function createDatabase(value) {
            if (value) {
                return Promise.resolve('数据库已经存在');
            }else {
                var sql = 'CREATE DATABASE ' + _config.sql_database;
                console.log(sql)
                return new Promise(function( resolve, reject) {
                    con.query(sql).then(function(value) {
                        resolve('创建数据库成功');
                    }).catch(function (err) {
                        reject("创建数据库失败" + err);
                    })
                })
            }
        }

        function hasTable() {
            var sql = 'SHOW TABLES FROM ' + _config.sql_database;
            return new Promise(function (resolve, reject) {
                con.query(sql).then(function(value) {
                    var tables = [];
                    _.each(value, function(item) {
                        tables.push(item['Tables_in_' + _config.sql_database]);
                    });
                    resolve(_.indexOf(tables, _config.sql_publish_table) >= 0);
                }).catch(function(err) {
                    reject('读取数据库失败！' + err);
                })
            });
        }

        function createTable(value) {
            if(value) {
                return Promise.resolve("表已经存在");
            }else {
                var sql = 'CREATE TABLE ' + _config.sql_publish_table + '(id int auto_increment PRIMARY KEY, Product varchar(50), Company varchar(50), Version varchar(200), CreateTime int, GreyId varchar(200), IsValid BOOL, User varchar(50), Info varchar(50), MD5 varchar(200)) ENGINE=InnoDB DEFAULT CHARSET=utf8;';
                return new Promise(function( resolve, reject) {
                    con.query(sql).then(function(value) {
                        resolve('创建表成功');
                    }).catch(function (err) {
                        reject("创建表失败" + err);
                    })
                })
            }
        }
    }).catch(function(err) {
        console.log(err)
    })
}

init();

