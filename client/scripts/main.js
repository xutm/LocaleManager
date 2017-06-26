angular.module('myModule', ['ui.router', 'main'], function($httpProvider) {
	// Use x-www-form-urlencoded Content-Type
	$httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
    $httpProvider.defaults.headers.common['Accept'] = 'application/json, text/plain, * / *';
    $httpProvider.defaults.withCredentials  = true;


	/**
		* The workhorse; converts an object to x-www-form-urlencoded serialization.
		* @param {Object} obj
		* @return {String}
	*/
	var param = function(obj) {
		var query = '', name, value, fullSubName, subName, subValue, innerObj, i;

		for(name in obj) {
			value = obj[name];

			if(value instanceof Array) {
				for(i=0; i<value.length; ++i) {
					subValue = value[i];
					fullSubName = name + '[' + i + ']';
					innerObj = {};
					innerObj[fullSubName] = subValue;
					query += param(innerObj) + '&';
				}
			}else if(value instanceof Object) {
				for(subName in value) {
					subValue = value[subName];
					fullSubName = name + '[' + subName + ']';
					innerObj = {};
					innerObj[fullSubName] = subValue;
					query += param(innerObj) + '&';
				}
			}else if(value !== undefined && value !== null) {
				query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
			}
		}

		return query.length ? query.substr(0, query.length - 1) : query;
	};

	// Override $http service's default transformRequest
	$httpProvider.defaults.transformRequest = [function(data) {
		return angular.isObject(data) && String(data) !== '[object File]' ? param(data) : data;
	}];
}).constant('urls', {
    api: 'http://locale.api.pre.ucloudadmin.com/'
}).config(function($stateProvider, $urlRouterProvider, $locationProvider) {
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });    

    var checkAuth = function($http, $state, loginData, urls) {
        $http.post(urls.api + 'login', loginData)
            .success(function(data){
                if(data === 'success'){
                    loginData.status = true;
                }else{
                    loginData.status = false;
                    $state.go('login');
                }
            })
            .error(function(data){
                console.log('Error: ' + data);
            });
		};

	$stateProvider.state('login', {
		url: "/login",
		templateUrl: "templates/login.html",
		controller: "LoginCtrl"
	}).state('menu', {
		url: "/menu",
		templateUrl: "templates/operate-json-menu.html",
		controller: "OperateJsonMenuCtrl",
	});

	$urlRouterProvider.otherwise('/menu');
});
