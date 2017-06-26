//set up===========================
var _config = require('./config');
var express = require('express');
var fs = require("fs");
var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
var app = express();         // create our app w/ express
//var user = require('./user');
var main = require('./main');

app.set('port', _config.port);
//parse application/x-www-form-urlencoded
app.use(bodyParser.json({limit: '50mb', extended: true}));
//parse application/vnd.api+json as json
app.use(bodyParser.urlencoded({extended: true, limit: '50mb', type: 'application/vnd.api+json'}));

app.all("*", function(req, res, next) {
    var origin = req['headers']['origin'];
    var reg = /\.ucloud\.cn/; 
    
    //if(reg.test(origin)){
        res.setHeader('Access-Control-Allow-Origin',(origin || 'ucloud.cn' || 'ucloudadmin.com'));
        //res.setHeader('Access-Control-Allow-Origin','*');
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.setHeader('Access-Control-Allow-Headers', 'Set-Cookie, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    //}

    next();
});

//app.use(user);
app.use(main);

//listen (start app with node server.js)==============
var server = app.listen(_config.port, function () {
	console.log("Server Up");
})
