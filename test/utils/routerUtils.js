'use strict';

var assert = require('assert');
var gu = require('../../');
var routerUtils = require('../../lib/utils/routerUtils');
var path = require('path');

describe('routerUtils', function() {

    describe('#resolveController()', function() {
    
        var controllersDir = path.join(__dirname, '..', 'controllers');
        
        it('should resolve and instantiate a controller', function() {
            var app = {};
            var controller = routerUtils.resolveController(app, controllersDir, 'home');
            
            assert.ok(controller, 'controller instance is missing');
            
            var controllerKeys = Object.keys(app.gu.controllers);
            assert.equal(controllerKeys.length, 1, 'should only be one controller instance');
            
            var controllerKey = controllerKeys[0];
            assert.equal(app.gu.controllers[controllerKey], controller, 'wrong controller instance');
        });
        
        it('should only instantiate a single controller instance per app', function() {
            var app = {};
            var controller = routerUtils.resolveController(app, controllersDir, 'home');
            var controllerAgain = routerUtils.resolveController(app, controllersDir, 'home');
            
            assert.equal(controller, controllerAgain, 'controller instances are not the same');
            assert.equal(Object.keys(app.gu.controllers).length, 1, 'should only be one controller instance');
        });
        
        it('should return different controller instances for different express app instances', function() {
            var app1 = {};
            var controller = routerUtils.resolveController(app1, controllersDir, 'home');
            
            var app2 = {};
            var otherController = routerUtils.resolveController(app2, controllersDir, 'home');
            
            assert.notEqual(controller, otherController, 'controllers should not be the same instance');
            
            assert.equal(Object.keys(app1.gu.controllers).length, 1, 'app1 should only have one controller');
            assert.equal(Object.keys(app2.gu.controllers).length, 1, 'app2 should only have one controller');
        });
    });

    describe('#executeController()', function() {
        it('should execute filters, events and actions sequentially and in the correct order', function(done) {
        
            var expectedOrder = [
                'BaseController.actionExecuting1',
                'BaseController.actionExecuting2',
                'Controller.actionExecuting1',
                'Controller.actionExecuting2',
                'BaseController.filter1',
                'BaseController.filter2',
                'Controller.filter1',
                'Controller.filter2',
                'action.filter1',
                'action.filter2',
                'action',
                'BaseController.actionExecuted1',
                'BaseController.actionExecuted2',
                'Controller.actionExecuted1',
                'Controller.actionExecuted2',
                'BaseController.resultExecuting1',
                'BaseController.resultExecuting2',
                'Controller.resultExecuting1',
                'Controller.resultExecuting2',
                'result',
                'BaseController.resultExecuted1',
                'BaseController.resultExecuted2',
                'Controller.resultExecuted1',
                'Controller.resultExecuted2'
            ];
            
            var actualOrder = [];
            
            var BaseController = gu.controller.create({
                filters: [
                    function(req, res, next) {
                        actualOrder.push('BaseController.filter1');
                        setTimeout(next, 2);
                    },
                    function(req, res, next) {
                        actualOrder.push('BaseController.filter2');
                        setTimeout(next, 2);
                    }
                ]
            });
            
            // We've jumbled the order uo deliberately
            BaseController.on('actionExecuted', function(req, res, next) {
                actualOrder.push('BaseController.actionExecuted1');
                setTimeout(next, 2);
            });
            
            BaseController.on('actionExecuted', function(req, res, next) {
                actualOrder.push('BaseController.actionExecuted2');
                setTimeout(next, 2);
            });
            
            BaseController.on('resultExecuted', function(req, res, next) {
                actualOrder.push('BaseController.resultExecuted1');
                setTimeout(next, 2);
            });
            
            BaseController.on('resultExecuted', function(req, res, next) {
                actualOrder.push('BaseController.resultExecuted2');
                setTimeout(next, 2);
            });
            
            BaseController.on('actionExecuting', function(req, res, next) {
                actualOrder.push('BaseController.actionExecuting1');
                setTimeout(next, 2);
            });
            
            BaseController.on('actionExecuting', function(req, res, next) {
                actualOrder.push('BaseController.actionExecuting2');
                setTimeout(next, 2);
            });
            
            BaseController.on('resultExecuting', function(req, res, next) {
                actualOrder.push('BaseController.resultExecuting1');
                setTimeout(next, 2);
            });
            
            BaseController.on('resultExecuting', function(req, res, next) {
                actualOrder.push('BaseController.resultExecuting2');
                setTimeout(next, 2);
            });
        
            var Controller = gu.controller.inherit(BaseController, {
                filters: [
                    function(req, res, next) {
                        actualOrder.push('Controller.filter1');
                        setTimeout(next, 2);
                    },
                    function(req, res, next) {
                        actualOrder.push('Controller.filter2');
                        setTimeout(next, 2);
                    }
                ]
            });
            
            Controller.on('actionExecuting', function(req, res, next) {
                actualOrder.push('Controller.actionExecuting1');
                setTimeout(next, 2);
            });
            
            Controller.on('actionExecuting', function(req, res, next) {
                actualOrder.push('Controller.actionExecuting2');
                setTimeout(next, 2);
            });
            
            Controller.on('actionExecuted', function(req, res, next) {
                actualOrder.push('Controller.actionExecuted1');
                setTimeout(next, 2);
            });
            
            Controller.on('actionExecuted', function(req, res, next) {
                actualOrder.push('Controller.actionExecuted2');
                setTimeout(next, 2);
            });
            
            Controller.on('resultExecuting', function(req, res, next) {
                actualOrder.push('Controller.resultExecuting1');
                setTimeout(next, 2);
            });
            
            Controller.on('resultExecuting', function(req, res, next) {
                actualOrder.push('Controller.resultExecuting2');
                setTimeout(next, 2);
            });
            
            Controller.on('resultExecuted', function(req, res, next) {
                actualOrder.push('Controller.resultExecuted1');
                setTimeout(next, 2);
            });
            
            Controller.on('resultExecuted', function(req, res, next) {
                actualOrder.push('Controller.resultExecuted2');
                setTimeout(next, 2);
            });
            
            Controller.actions = {
                index: {
                    filters: [
                        function(req, res, next) {
                            actualOrder.push('action.filter1');
                            setTimeout(next, 2);
                        },
                        function(req, res, next) {
                            actualOrder.push('action.filter2');
                            setTimeout(next, 2);
                        }
                    ],
                    GET: function(req, res) {
                        actualOrder.push('action');
                        res.render();
                    }
                }
            }
            
            var controller = new Controller();
            var action = controller.actions['index'];
            
            var req = {};
            
            var res = {};
            
            res.end = function() {
                actualOrder.push('result');
            };
            
            res.render = function() {
                res.end();
            };
            
            var next = function() {};
            
            routerUtils.executeController({
                controller: controller,
                action: action,
                verb: 'GET',
                req: req,
                res: res,
                next: next
            },
            function() {
            
                /* actualOrder.forEach(function(actual) {
                    console.log(actual); 
                }); */
            
                expectedOrder.forEach(function(expectedMessage, index) {
                    var actualMessage = actualOrder[index];
                    assert.equal(actualMessage, expectedMessage, 'at index pos: ' + index);
                });
            
                done();
            });
        });
        
        it('should not provide a next() middleware callback if next is not called in action', function(done) {
            var Controller = gu.controller.create();
            
            Controller.actions = {
                index: {
                    GET: function(req, res, next) {
                        res.end();
                    }
                }
            };
            
            var controller = new Controller();
            var action = controller.actions['index'];
            
            var req = {};
            
            var res = {};
            res.end = function() {};
            
            var next = function() {};
            
            routerUtils.executeController({
                controller: controller,
                action: action,
                verb: 'GET',
                req: req,
                res: res,
                next: next
            },
            function(next) {
                assert.ok(!next, 'next middlewear should NOT be present');
                done();
            });
        });
        
        it('should allow action to call next()', function(done) {
            var Controller = gu.controller.create();
            
            Controller.actions = {
                index: {
                    GET: function(req, res, next) {
                        setTimeout(next, 2);
                    }
                }
            };
            
            var controller = new Controller();
            var action = controller.actions['index'];
            
            var req = {};
            var res = {};
            var next = function() {};
            
            routerUtils.executeController({
                controller: controller,
                action: action,
                verb: 'GET',
                req: req,
                res: res,
                next: next
            },
            function(next) {
                assert.ok(next, 'next middleware callback should be present');
                done();
            });
        });
        
        it('should allow any event/filter to NOT call next() and prevent further processig', function(done) {
            var Controller = gu.controller.create({
                filters: [
                    function(req, res, next) {
                        res.render('I am ending this!');
                    }
                ]
            });
            
            Controller.on('actionExecuted', function() {
                assert.ok(false, 'We should never reach the actionExecuted event');
            });
            
            Controller.on('resultExecuting', function() {
                assert.ok(false, 'We should never reach the resultExecuting event');
            });
            
            Controller.on('resultExecuted', function() {
                assert.ok(false, 'We should never reach the resultExecuted event');
            });
            
            Controller.actions = {
                index: {
                    GET: function(req, res, next) {
                        assert.ok(false, 'We should never reach this point');
                    }
                }
            };
            
            var req = {};
            
            var res = {};
            res.end = function() {};
            
            res.render = function(msg) {
                res.end(msg);
            };
            
            var next = function() {};
            
            var controller = new Controller();
            var action = controller.actions['index'];
            
            routerUtils.executeController({
                controller: controller,
                action: action,
                verb: 'GET',
                req: req,
                res: res,
                next: next
            },
            function(next) {
                assert.ok(!next, 'next middleware callback should not be present');
                done();
            });
        });
        
        it('should not call the same events multiple times', function(done) {
            var req = {};
            
            var res = {};
            res.end = function() {};
            res.send = function() {
                res.end();
            }
            res.render = function() {
                res.send();
            };
            
            var next = function() {};
            
            var eventCalls = 0;
            
            var Controller = gu.controller.create();
            
            Controller.on('actionExecuting', function(req, res, next) {
                eventCalls++;
                next();
            });
            
            Controller.on('actionExecuted', function(req, res, next) {
                eventCalls++;
                next();
            });
            
            Controller.on('resultExecuting', function(req, res, next) {
                eventCalls++;
                next();
            });
            
            Controller.on('resultExecuted', function(req, res, next) {
                eventCalls++;
                next();
            });
            
            Controller.actions = {
                index: {
                    GET: function(req, res, next) {
                        res.render();
                    }
                }
            };
            
            var controller = new Controller();
            var action = controller.actions['index'];
            
            routerUtils.executeController({
                controller: controller,
                action: action,
                verb: 'GET',
                req: req,
                res: res,
                next: next
            },
            function(next) {
                assert.equal(eventCalls, 4, 'only 4 events should have been called, but was called ' + eventCalls + ' times');
                done();
            });
        });
        
        it('should allow result methods to return values', function(done) {
            var req = {};
            
            var res = {};
            
            res.end = function() { return 'Hello world'; };
            res.send = function() {
                return res.end()
            }
            res.render = function() {
                var retVal = res.send();
                assert.equal(retVal, 'Hello world');
                done();
            };
            
            var next = function() {};
            
            var Controller = gu.controller.create({
                filters: [
                    function (req, res, next) {
                        setTimeout(function() {
                            next();
                        }, 2);
                    }
                ]
            });
            
            Controller.on('actionExecuting', function(req, res, next) { return next(); });
            Controller.on('actionExecuted', function(req, res, next) {
                setTimeout(function() {
                    next();
                }, 2);
            });
            Controller.on('resultExecuting', function(req, res, next) { return next(); });
            Controller.on('resultExecuted', function(req, res, next) { return next(); });
            
            Controller.actions = {
                index: {
                    GET: function(req, res, next) {
                        res.render();
                    }
                }
            };

            var controller = new Controller();
            var action = controller.actions['index'];
            
            routerUtils.executeController({
                controller: controller,
                action: action,
                verb: 'GET',
                req: req,
                res: res,
                next: next
            },
            function(next) { });
        });
        
        it('should allow properties to be added to "this" context which persist for other filters, events and actions', function(done) {
            var req = {};
            
            var res = {};
            res.locals = {};
            res.end = function() {};
            
            var next = function() {};
            
            var assertions = 0;
            
            var BaseController = gu.controller.create({
                filters: [
                    function(req, res, next) {
                        assert.equal(this.message, 'hello');
                        assertions++;
                        next();
                    }
                ]
            });
            
            BaseController.on('actionExecuting', function(req, res, next) {
                this.message = 'hello';
                
                assert.equal(this.message, 'hello');
                assertions++;
                next();
            });
            
            BaseController.on('actionExecuted', function(req, res, next) {
                assert.equal(this.message, 'hello');
                assertions++;
                next();
            });
            
            BaseController.on('resultExecuting', function(req, res, next) {
                assert.equal(this.message, 'hello');
                assertions++;
                next();
            });
            
            BaseController.on('resultExecuted', function(req, res, next) {
                assert.equal(this.message, 'hello');
                assertions++;
                next();
            });
            
            var Controller = gu.controller.inherit(BaseController, {
                filters: [
                    function(req, res, next) {
                        assert.equal(this.message, 'hello');
                        assertions++;
                        next();
                    }
                ]
            });
            
            Controller.on('actionExecuting', function(req, res, next) {
                assert.equal(this.message, 'hello');
                assertions++;
                next();
            });
            
            Controller.on('actionExecuted', function(req, res, next) {
                assert.equal(this.message, 'hello');
                assertions++;
                next();
            });
            
            Controller.on('resultExecuting', function(req, res, next) {
                assert.equal(this.message, 'hello');
                assertions++;
                next();
            });
            
            Controller.on('resultExecuted', function(req, res, next) {
                assert.equal(this.message, 'hello');
                assertions++;
                next();
            });
                
            Controller.actions = {
                index: {
                    filters: [
                        function(req, res, next) {
                            assert.equal(this.message, 'hello');
                            assertions++;
                            next();
                        }
                    ],
                    GET: function(req, res) {
                        assert.equal(this.message, 'hello');
                        assertions++;
                        res.end();
                    }
                }
            };
            
            var controller = new Controller();
            var action = controller.actions['index'];
            
            routerUtils.executeController({
                controller: controller,
                action: action,
                verb: 'GET',
                req: req,
                res: res,
                next: next
            },
            function(next) {
                
                assert.equal(assertions, 12, 'Incorrect number of assertions have run');
                
                done();
            });
        });
        
        describe('#viewbag()', function() {
            it('should set locals on HttpResponse object', function(done) {
                var req = {};
            
                var res = {};
                res.locals = {};
                res.end = function() {};
                
                var next = function() {};
                
                var unitTestsRun = false;
                
                var Controller = gu.controller.create({
                    filters: [
                        function(req, res, next) {
                            this.viewbag().message1 = 'Hello';
                            next();
                        }
                    ]
                });
                
                Controller.actions = {
                    index: {
                        GET: function(req, res) {
                            this.viewbag().message2 = 'World';
                            res.end();
                        }
                    }
                };
                
                Controller.on('actionExecuted', function(req, res, next) {
                    assert.ok(res.locals.viewbag, 'viewbag property is missing');
                    assert.equal(res.locals.viewbag.message1, 'Hello', 'viewbag.message1 is missing or wrong value');
                    assert.equal(res.locals.viewbag.message2, 'World', 'viewbag.message2 is missing or wrong value');
                    
                    unitTestsRun = true;
                    
                    next();
                });
                
                var controller = new Controller();
                var action = controller.actions['index'];
                
                routerUtils.executeController({
                    controller: controller,
                    action: action,
                    verb: 'GET',
                    req: req,
                    res: res,
                    next: next
                },
                function(next) {
                    assert.ok(unitTestsRun);
                    done();
                });
            });
        });
    });
});