function Scope() {
	this.$watchers = [];
}

Scope.prototype.$watch = function(watchFn, listenerFn) {
	this.$watchers.push({
		watchFn: watchFn,
		listenerFn: listenerFn
	});
};

Scope.prototype.$digest = function() {
	for (var i = 0; i < this.$watchers.length; i++) {
		this.$watchers[i].listenerFn();
	}
};

module.exports = Scope;