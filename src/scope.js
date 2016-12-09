function Scope() {
	this.$watchers = [];
}

var initValue = function() {};

Scope.prototype.$watch = function(watchFn, listenerFn, valueEqual) {
	this.$watchers.push({
		watchFn: watchFn,
		listenerFn: listenerFn,
		oldValue: initValue,
		valueEqual: valueEqual
	});
};

Scope.prototype.$digest = function() {
	var dirty;
	var ttl = 10;

	do {
		dirty = false;
		for (var i = 0; i < this.$watchers.length; i++) {

			var _watcher = this.$watchers[i];

			var newValue = _watcher.watchFn(this); 
			var oldValue = _watcher.oldValue;

			if (_watcher.valueEqual ? !areEquel(newValue, oldValue) : newValue !== oldValue) {
				dirty = true;

				_watcher.oldValue = _watcher.valueEqual ? clone(newValue) : newValue;

				if (_watcher.listenerFn) {
					_watcher.listenerFn(newValue, oldValue, this);
				}
			}
		}
		if(dirty && !(ttl--)) {
			throw Error('dsf')
		}

	} while (dirty);
};

function clone(arr) {
	return arr.slice();
}

function areEquel(a, b) {
	if (typeof a === typeof b) {
		return (a.length === b.length);
	}

	return false;
}

module.exports = Scope;