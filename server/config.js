var _config = {
    dev : {
        redis_ip : '192.168.150.170',
        redis_port : '6379',
        api_error_code : 'https://api-manager.ucloudadmin.com',
        port: 4990,
        sql_host: 'localhost',
        sql_user: 'root',
        sql_password: '',
        sql_database: 'uweb',//必须提前创建
        sql_publish_table: 'locale_version',
        locale: 'locale_data/',
        publish_path: '/srv/http/locale_data/',
    },

    pre : {
        redis_ip : '192.168.153.100',
        redis_port : '5858',
        servers:['192.168.153.101'],
        api_error_code : 'https://api-manager.ucloudadmin.com',
        grey_table: 'https://console-admin.pre.ucloudadmin.com',
        port: 4990,
        sql_host: 'localhost',
        sql_user: 'root',
        sql_password: '',
        sql_database: 'uweb',//必须提前创建
        sql_publish_table: 'locale_version',
        locale: 'locale_data/',
        publish_path: '/srv/http/',
    },

    production : {
        redis_ip : '127.0.0.1',
        redis_port : '5858',
        servers:['172.17.144.22','172.17.144.29','172.17.144.36','172.17.144.43','172.28.246.174','172.28.246.137','172.28.246.135','172.28.246.178','172.27.118.206','172.27.118.148','172.27.118.209','172.27.118.208'],
        api_error_code : 'https://api-manager.ucloudadmin.com',
        grey_table: 'https://console-admin.ucloudadmin.com',
	port: 4990,
        sql_host: 'localhost',
        sql_user: 'root',
        sql_password: '',
        sql_database: 'uweb',//必须提前创建
        sql_publish_table: 'locale_version',
        locale: 'locale_data/',
        publish_path: '/srv/http/',
    }
}




var _env = process.env.NODE_ENV;
if(!_env){
    _env = 'dev';
}


console.log(_config[_env]);

module.exports = _config[_env];
