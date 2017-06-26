var module = angular.module('main');

module.filter('startFrom', function() {
	return function(input, start, scope) {
		start = +start;
		scope.maxPage = Math.floor(input.length/scope.pageSize) + 1;
		return input.slice(start);
	};
});

module.filter('keyFilter', function($filter) {
	return function(datum, scope, value, key) {

		var foundInObj = function(data, reg) {
			//_.each(data, function(value, key) {
			//	if(reg.test(value))
			//		return true
			//});
			var dataCp = angular.copy(data);
			var values = _.values(dataCp);
			for(var i = 0;i < values.length;i++){
				if(reg.test(values[i])){
					return true;
				}
			}
			//for(var i in dataCp){
			//	if(reg.test(dataCp[i])){
			//		return true;
			//	}
			//}
			return false;
		}

		var found = function(data, value) {

			if(!data || !value)
				return true;

			var value = value.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");
			var reg = new RegExp(value, 'i');

			if(key === 'All'){
				if(foundInObj(data, reg)){
					return true;
				}
			}else if(reg.test(data[key])){
				return true;
			}

			return false;
		}

		return _.filter(datum, function(data){
			return found(data, value, key);
		});
	}
});