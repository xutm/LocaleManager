var express = require('express');
var config = require('./config.json');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var cookieParser = require('cookie-parser');
var md5 = require('md5');
var session = require("express-session");
var app = module.exports = express.Router();
app.use(cookieParser());
app.use(session({ secret: 'keyboard cat'}));

var pool = mysql.createPool({
    connectionLimit: 100,
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    debug: false
});

//var users;
function isLogin(req){
    return req.cookies.cookieStatus;
};

function redirect(req, res, path){
    var ref = req['headers']['referer'];
    var reg = /^(http(?:s)?):\/\/([^\/]+)/;
    var urls = reg.exec(ref);
    var path = path || '/';
    var url = urls[1] + '://' + urls[2] + path;

    res.redirect(url);
}

function login(req, res, next){
    pool.getConnection(function(err,con){
        if(err){
            con.release();
            return;
        }
        
        con.query('SELECT * FROM users WHERE user= ? AND password= ?',[req.body.UserName, md5(req.body.Password)], function(err,result){
            con.release();
            if(err) throw err;
            
            if(result.length){
                req.session.name = req.body.UserName;
                res.cookie('cookieStatus', true, {domain: '.ucloudadmin.com', httpOnly: true});
                redirect(req, res);
            }else{
                redirect(req, res, '/login');
            }
        });
        
        con.on('error', function(err){
            return;
        });
    });
}

app.use(bodyParser.urlencoded({ extended: false }));

app.all(/\/[^login|logout]/, function(req, res, next){
    if (isLogin(req)){
        return next();
    }
    
    res.send(401, 'Need to login!')
});

app.all('/login', function(req, res) {
    if(isLogin(req)){
        return redirect(req, res);
    }

    login(req, res); 
});

app.all('/logout', function(req, res) {
    var referer = req['headers']['referer'];

    res.clearCookie('cookieStatus', {domain: '.ucloudadmin.com', httpOnly: true});
    redirect(req, res, '/login');
});


