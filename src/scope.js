var _ = require('lodash');
function Scope() {
	this.$watchers = [];
	this.$evalAsyncQueue = [];
	this.$applyAsyncQueue = [];
	this.lastDirtyWatch = null;
	this.$$phase = null;
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

	this.$$phase = '$digest';

	do {
		dirty = false;

		while (this.$evalAsyncQueue.length) {
			var evalAsyncItem = this.$evalAsyncQueue.shift();
			evalAsyncItem.scope.$eval(evalAsyncItem.expr);
		}

		while (this.$applyAsyncQueue.length) {
			var applyAsyncItem = this.$applyAsyncQueue.shift();
			applyAsyncItem.scope.$eval(evalAsyncItem.expr);
		}

		for (var i = this.$watchers.length - 1; i >= 0; i--) {
			try {

				var _watcher = this.$watchers[i];

				var newValue = _watcher.watchFn(this);
				var oldValue = _watcher.oldValue;


				if (!areEqual(newValue, oldValue, _watcher.valueEqual)) {
					dirty = true;

					this.lastDirtyWatch = _watcher;

					_watcher.oldValue = _watcher.valueEqual ? _.cloneDeep(newValue) : newValue;

					if (_watcher.listenerFn) {
						_watcher.listenerFn(newValue, oldValue, this);
					}
				} else if (_.isEqual(_watcher, this.lastDirtyWatch)) {
					this.lastDirtyWatch = null;
					break;
				}
			} catch (err) {
				console.error(err);
			}
		}

		if((dirty || this.$evalAsyncQueue.length || this.$applyAsyncQueue.length) && !(ttl--)) {
			throw Error('0 digest iterations reached')
		}
	} while (dirty || this.$evalAsyncQueue.length || this.$applyAsyncQueue.length);

	this.$$phase = null;

};

Scope.prototype.$eval = function(expr, locals) {
	return expr(this, locals);
}

Scope.prototype.$apply = function(expr) {
	try {
		this.$$phase = '$apply';
		this.$eval(expr);
	}
	finally {
		this.$$phase = null;
		this.$digest();
	}
}

Scope.prototype.$evalAsync = function(expr) {
	var self = this;

	self.$evalAsyncQueue.push({scope: self, expr: expr});

	if(!self.$$phase && self.$evalAsyncQueue.length) {
		setTimeout(function(){
			self.$digest();
		});
	}

}

Scope.prototype.$applyAsync = function(expr) {
	var self = this;

	self.$applyAsyncQueue.push({scope: self, expr: expr});

	// if(!self.$$phase && self.$evalAsyncQueue.length) {
	// 	setTimeout(function(){
	// 		self.$digest();
	// 	});
	// }

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