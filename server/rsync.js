/**
 * Created by L on 2016/11/17.
 */
var exec = require ( 'child_process' ).exec;

var rsync = function ( dstServers , deployArgs ) {
    return new Promise ( function ( resolve , reject ) {
        "use strict";
        var cmds = [];
        for ( var i = 0; i < dstServers.length; i++ ) {
            var cmd = "rsync -zrtopglavR --password-file=/etc/rsync-client.passwd  "
                + deployArgs.path + ' upload@' + dstServers[ i ] + '::http';
            cmds.push ( cmd );
        }
        var cmdStrings = cmds.join ( '&&' );
        console.log ( 'cmdStrings====>' , cmdStrings );
        console.log ( 'dstServers====>' , dstServers );
        console.log ( 'deployArgs====>' , deployArgs );
        exec ( cmdStrings , {
            cwd : deployArgs.cmd
        } , function ( err , stdout , stderr ) {
            if ( err ) {
                console.log ( '同步代码到 ： 遇到错误' , err )
                reject ( err );
            } else {
                console.log ( '同步代码到 ： 成功' )
                resolve (stdout);
            }
        } )
    } );
};

module.exports = rsync;