var Scope = require('./scope');

describe('Scope', function() {
    it('can be instantiated', function(){
        var scope = new Scope();
        expect(scope).toBeDefined();
    });

    describe('$digest', function() {
        var scope = null;

        beforeEach(function() {
            scope = new Scope();
        });

        it('calls the listener function of a watch on first digest', function(){
            var spy = jasmine.createSpy();

            scope.a = 10;

            scope.$watch(function(scope) {
                return scope.a;
            }, spy);

            scope.$digest();

            expect(spy).toHaveBeenCalled();
        });

        it('passes scope to the watch function', function(){
            var spy = jasmine.createSpy();

            scope.$watch(spy, function() {
                //pass
            });

            scope.$digest();

            expect(spy).toHaveBeenCalledWith(scope);
        });

        it('calls listener fn only when data are really changed', function(){
            scope.a       = 10;
            scope.counter = 0;

            var listenerFn = function(newValue, oldValue, scope) {
                scope.counter++;
            }

            var watchFn = function(scope) {
                return scope.a;
            }

            scope.$watch(watchFn, listenerFn);

            expect(scope.counter).toBe(0);

            scope.$digest();

            expect(scope.counter).toBe(1);

            scope.$digest();

            expect(scope.counter).toBe(1);

            scope.a = 0;

            scope.$digest();

            expect(scope.counter).toBe(2);
        });

        it('calls listener when watch value is first undefined', function() {  
            scope.counter = 0;  

            scope.$watch(function(scope) { 
                return scope.someValueThatReturnsUndefined; 
            }, function(newValue, oldValue, scope) { 
                scope.counter++; 
            });

            scope.$digest();

            expect(scope.counter).toBe(1);
        }); 

        it('may have watchers that omit the listener function', function() {  
            var watchFn = jasmine.createSpy().and.returnValue('something');  

            scope.$watch(watchFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalled();
        });

        /*
            Прочитав этот тест, основная идея долна быть понятна -- `listenerFn` 
            может изменять данные в скоупе, и эти изменения должны быть 
            подхвачены ангуларом.

            Т.е. выполнив дайджест, нужно проверить был ли этот дайджест чистым, 
            и если нет -- выполнить дайджест еще раз.

            Термин "чистый", в данном случае сигнализирует о том, что данные во всех 
            вотчах не поменялись.

            Это поведение является одной из особенностей ангулара -- дайджест всегда 
            выполняется минимум два раза. 

            По-этому, когда вы сталкиваетесь с проблемой производительности в ангулар
            приложениях, первым делом обратите внимание на кол-во вотчей.
        */
        it('triggers chained watchers in the same digest', function() {
            scope.name = 'Platon';  

            scope.$watch(function(scope) { 
                return scope.nameUpper; 
            }, function(newValue, oldValue, scope) {
                if (newValue) {
                    scope.initial = newValue.substring(0, 1) + '.';
                }
            });  

            scope.$watch(function(scope) { 
                return scope.name; 
            }, function(newValue, oldValue, scope) {
                if (newValue) {
                    scope.nameUpper = newValue.toUpperCase();
                }
            });

            scope.$digest();

            expect(scope.initial).toBe('P.');

            scope.name = 'Aline';

            scope.$digest();

            expect(scope.initial).toBe('A.'); 
        });


        // /*
        //     Исходя их предидущего теста, дайджест может зациклиться когда один, 
        //     или несколько вотчей, всегда остаются грязными, т.е. изменяют данные в скоупе.

        //     Чтобы этого не допустить, ангулар ограничивает максимальное кол-во дайджестов.
        //     По умолчанию это 10 дайджест циклов. 

        //     При достижении этого лимита нужно выбросить ошибку.
        // */
        it('gives up on the watches after 10 iterations', function() {  
            scope.counterA = 0; 
            scope.counterB = 0;

            scope.$watch(function(scope) { 
                return scope.counterA; 
            }, function(newValue, oldValue, scope) {
                scope.counterB++;
            });

            scope.$watch(function(scope) { 
                return scope.counterB; 
            }, function(newValue, oldValue, scope) {
                scope.counterA++;
            });

            expect((function() { 
                scope.$digest();
            })).toThrow();
        });

        it('compares based on value if enabled', function() {
            scope.aValue = [1, 2, 3];
            scope.counter = 0;

            scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            }, true);

            scope.$digest();

            expect(scope.counter).toBe(1);

            scope.aValue.push(4);

            scope.$digest();

            expect(scope.counter).toBe(2);
        });

        it('correctly handles NaNs', function() {
            scope.number = 0 / 0; //NaN
            scope.counter = 0;

            scope.$watch(function(scope) {
                return scope.number;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$digest();

            expect(scope.counter).toBe(1);

            scope.$digest();

            expect(scope.counter).toBe(1);
        });

        it('catches exceptions in watch functions and continues', function() {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(function(scope) {
                throw 'Error';
            }, function(newValue, oldValue, scope) {});

            scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$digest();

            expect(scope.counter).toBe(1);
        });

        it('catches exceptions in listener functions and continues', function() {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                throw 'Error';
            });

            scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$digest();

            expect(scope.counter).toBe(1);
        });

        // /*
        //     Метод `$watch` должен возвращать функцию, которая при вызове удаляет вотч.

        //     Однако, все не так просто как звучит. 

        //     Давайте представим что мы проходим список вотчей слева на право, 
        //     и в момент срабатывания `listenerFn` 3-го вотча мы его удаляем.

        //            ------------------->

        //     i=0    i=1    i=2    i=3    i=4
        //     +----+ +----+ +----+ +----+ +----+
        //     |  1 | |  2 | |  3 | |  4 | |  5 |
        //     +----+ +----+ +----+ +----+ +----+
        //                     ^
        //                     |

            
        //     Допустим мы используем метод `splice`, чтобы удалить елемент в массиве
        //     вотчей. При его срабатывании, 4-й вотч станет на место 3-го, а 5-й -- на место 4-го.
        //     Но переменная `i` не поменяет свое значение, таким образом картина будет такой:

        //            ------------------->

        //     i=0    i=1    i=2    i=3
        //     +----+ +----+ +----+ +----+
        //     |  1 | |  2 | |  4 | |  5 |
        //     +----+ +----+ +----+ +----+
        //                     ^
        //                     |

        //     И т.к. мы обработали елемент с индексом 2, мы переходим на следующую итерацию
        //     цикла, и `i` будет равна 3, пропуская 4-й вотч. 
        // */
        it('allows destroying a $watch with a removal function', function() {
            scope.aValue = 'abc';
            scope.counter = 0;

            var destroyWatch = scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            });



            scope.$digest();

            expect(scope.counter).toBe(1);

            scope.aValue = 'def';

            scope.$digest();

            expect(scope.counter).toBe(2);

            scope.aValue = 'ghi';

            destroyWatch();

            scope.$digest();

            expect(scope.counter).toBe(2);
        });

        it('allows destroying a $watch during digest', function() {
        });

        it('allows destroying several $watches during digest', function() {
        });

        /*
            \*Задание со звездочкой.

            Как мы уже знаем, дайджест всегда выполняется минимум два раза,
            а это расточительно.
            
            В связи с чем, команда ангулара добавила простую оптимизацию
            чтобы уменьшить кол-во дайджестов.

            Давайте представим список вотчей в виде списка:

            +--+  +--+  +--+  +--+ +--+
            |1 |  |2 |  |3*|  |4 | |5 |
            +--+  +--+  +--+  +--+ +--+

            Если во время обработки 3-го вотча, он оказался грязным, нам нужно
            выполнить дайджест еще раз, чтобы удостовериться что все вотчи чистые.

            Однако, при втором дайджест-цикле, если 3-й вотч оказался чистым, то
            проверка 4-го и 5-го вотчей является избыточной, т.к. при первом цикле 
            они были чистыми. 

            В этом и состоит суть оптимизации -- запомнить последний грязный вотч,
            и каждый раз когда мы встречаем чистый вотч, мы проверяем а не этот ли это
            вотч, который был грязным в прошлый раз.

            Таким образом мы можем уменьшить кол-во дайджестов в половину.

        */
        xit('optimize $digest circle', function() {
        });
    });

    describe('$eval', function() {
        var scope = null;

        beforeEach(function() {
            scope = new Scope();
        });

        it('executes passed to $eval function and returns result', function() {
            scope.val = 10;

            var retVal = scope.$eval(function(scope) {
                return scope.val + 10;
            });

            expect(retVal).toBe(20);
        });
    });

    describe('$apply', function() {
        var scope = null;

        beforeEach(function() {
            scope = new Scope();
        });

        it('executes the given function and starts the digest', function() {
            scope.aValue = '123';
            scope.counter = 0;

            scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$digest();

            expect(scope.counter).toBe(1);

            scope.$apply(function(scope) {
                scope.aValue = '456';
            });

            expect(scope.counter).toBe(2);
        });
    });

    xdescribe('$evalAsync', function() {
        var scope;

        beforeEach(function() {
            scope = new Scope();
        });

        it('executes given function later in the same cycle', function() {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
            scope.asyncEvaluatedImmediately = false;

            scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.$evalAsync(function(scope) {
                    scope.asyncEvaluated = true;
                });
                scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
            });

            scope.$digest();

            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);
        });

        it('executes $evalAsynced functions added by watch functions', function() {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;

            scope.$watch(function(scope) {
                if (!scope.asyncEvaluated) {
                    scope.$evalAsync(function(scope) {
                        scope.asyncEvaluated = true;
                    });
                }
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                //pass
            });

            scope.$digest();

            expect(scope.asyncEvaluated).toBe(true);
        });

        it('executes $evalAsynced functions even when not dirty', function() {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluatedTimes = 0;

            scope.$watch(function(scope) {
                if (scope.asyncEvaluatedTimes < 2) {
                    scope.$evalAsync(function(scope) {
                        scope.asyncEvaluatedTimes++;
                    });
                }
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                //pass
            });

            scope.$digest();

            expect(scope.asyncEvaluatedTimes).toBe(2);
        });

        it('eventually halts $evalAsyncs added by watches', function() {
            scope.aValue = [1, 2, 3];

            scope.$watch(function(scope) {
                scope.$evalAsync(function(scope) {
                    //pass
                });

                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                //pass
            });

            expect(function() {
                scope.$digest();
            }).toThrow();
        });

        it('has a $$phase field whose value is the current digest phase', function() {
            scope.aValue = [1, 2, 3];
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.$watch(function(scope) {
                scope.phaseInWatchFunction = scope.$$phase;
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.phaseInListenerFunction = scope.$$phase;
            });

            scope.$apply(function(scope) {
                scope.phaseInApplyFunction = scope.$$phase;
            });

            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');
        });

        it('schedules a digest in $evalAsync', function(done) {
            scope.aValue = 'abc';
            scope.counter = 0;

            scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$evalAsync(function(scope) {
                //pass
            });

            expect(scope.counter).toBe(0);

            setTimeout(function() {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });

    });

    describe('$applyAsync', function() {
        var scope;

        beforeEach(function() {
            scope = new Scope();
        });

        it('allows async $apply with $applyAsync', function(done) {
            scope.counter = 0;

            scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.counter++;
            });

            scope.$digest();

            expect(scope.counter).toBe(1);

            scope.$applyAsync(function(scope) {
                scope.aValue = 'abc';
            });

            expect(scope.counter).toBe(1);

            setTimeout(function() {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('never executes $applyAsynced function in the same cycle', function(done) {
            scope.aValue = [1, 2, 3];
            scope.asyncApplied = false;

            scope.$watch(function(scope) {
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                scope.$applyAsync(function(scope) {
                    scope.asyncApplied = true;
                });
            });

            scope.$digest();

            expect(scope.asyncApplied).toBe(false);

            setTimeout(function() {
                expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        });

        it('coalesces many calls to $applyAsync', function(done) {
            scope.counter = 0;

            scope.$watch(function(scope) {
                scope.counter++;
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                //pass
            });

            scope.$applyAsync(function(scope) {
                scope.aValue = 'abc';
            });

            scope.$applyAsync(function(scope) {
                scope.aValue = 'def';
            });

            setTimeout(function() {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('cancels and flushes $applyAsync if digested first', function(done) {
            scope.counter = 0;

            scope.$watch(function(scope) {
                scope.counter++;
                return scope.aValue;
            }, function(newValue, oldValue, scope) {
                //pass
            });

            scope.$applyAsync(function(scope) {
                scope.aValue = 'abc';
            });

            scope.$applyAsync(function(scope) {
                scope.aValue = 'def';
            });

            scope.$digest();

            expect(scope.counter).toBe(2);
            expect(scope.aValue).toEqual('def');

            setTimeout(function() {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

    });
});