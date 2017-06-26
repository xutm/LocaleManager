angular.module('main').controller('LoginCtrl', function($scope, $state, $http, $sce, urls, loginData) {
    $scope.action = $sce.trustAsResourceUrl(urls.api + 'login');
	$scope.doAuth = function() {
		loginData.UserName = $scope.loginData.UserName;
		loginData.Password = $scope.loginData.Password;
        //$state.go('menu');
	};
});
