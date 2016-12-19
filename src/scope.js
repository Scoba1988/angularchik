var _ = require('lodash');
function Scope() {
	this.$watchers = [];
}

var initValue = function() {};

Scope.prototype.$watch = function(watchFn, listenerFn, valueEqual) {
	var watcher = {
		watchFn: watchFn,
		listenerFn: listenerFn,
		oldValue: initValue,
		valueEqual: !!valueEqual
	}

	this.$watchers.push(watcher);

	var currentScope = this;

	return function() {
		var index = currentScope.$watchers.indexOf(watcher);
		
		if(index >= 0) {
			currentScope.$watchers.splice(index, 1);
		}
	}
};

Scope.prototype.$digest = function() {
	var dirty;
	var ttl = 10;

	do {
		dirty = false;

		for (var i = this.$watchers.length - 1; i >= 0; i--) {
			try {

				var _watcher = this.$watchers[i];

				var newValue = _watcher.watchFn(this);
				var oldValue = _watcher.oldValue;

				if (!areEqual(newValue, oldValue, _watcher.valueEqual)) {
					dirty = true;

					_watcher.oldValue = _watcher.valueEqual ? _.cloneDeep(newValue) : newValue;

					if (_watcher.listenerFn) {
						_watcher.listenerFn(newValue, oldValue, this);
					}
				}
			} catch (err) {
				console.error(err);
			}
		}
		if(dirty && !(ttl--)) {
			throw Error('0 digest iterations reached')
		}

	} while (dirty);
};

Scope.prototype.$eval = function(expr, locals) {
	return expr(this, locals);
}

Scope.prototype.$apply = function(expr) {
	try {
		this.$eval(expr);
	}
	finally {
		this.$digest();
	}
}

function areEqual(newValue, oldValue, valueEqual) {
	if (valueEqual) {
		return _.isEqual(newValue, oldValue);
	} else {
		return newValue === oldValue || 
			(typeof newValue === 'number' && typeof oldValue === 'number' && isNaN(newValue) && isNaN(oldValue));
	}
}

module.exports = Scope;