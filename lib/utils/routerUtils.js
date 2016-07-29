"use strict";

let path = require('path');
let co = require('co');
const controllerAffix = 'Controller.js';
const isGeneratorRegExp = /^function\s*\*\s*[a-zA-Z0-9_]*\(/;

function viewBag() {
  this.locals.viewBag = this.locals.viewBag || {}; //this，res对象

  return this.locals.viewBag;
}

/**
 * 重载express包装的res.render，res.send，res.json，res.end等结果方法
 * 在执行res对象上原始方法的前后，执行一系列自定义的方法
 *
 * @param {String} resultFunc 要重载的方法名
 * @param {Object} controller controller实例
 * @param req
 * @param res
 * @param finishedCallback
 */
function overrideResultFunction(resultFunc, controller, req, res, finishedCallback) {
  let func = res[resultFunc];

  res[resultFunc] = function () {
    let args = arguments;

    if (res.gu.status.reachedAction) {
      if (!res.gu.status.reachedEvents) { //阻止事件触发多次，因为res对象上的方法有时会相互调用
        res.gu.status.reachedEvents = true;

        let middlewareCallbacks = [];

        controller.listeners('actionExecuted').forEach(function (listener) {
          middlewareCallbacks.push(listener);
        });

        controller.listeners('resultExecuting').forEach(function (listener) {
          middlewareCallbacks.push(listener);
        });

        callNextMiddleware(middlewareCallbacks, controller, req, res, function () { //finalCallback
          func.apply(res, args); //调用express框架对应的原始方法

          let resultExecutedCallbacks = [];

          controller.listeners('resultExecuted').forEach(function (listener) {
            resultExecutedCallbacks.push(listener);
          });

          callNextMiddleware(resultExecutedCallbacks, controller, req, res, function () {
            finishedCallback(null); //默认参数，next函数
          });
        });
      } else {
        return func.apply(res, args);
      }
    } else {
      if (!res.gu.status.finished) {
        res.gu.status.finished = true;

        finishedCallback(null);
      }

      return func.apply(res, args);
    }
  };
}

function callNextMiddleware(middlewareCallbacks, controller, req, res, finalCallback) {
  let func = middlewareCallbacks.shift();

  if (func) {
    let funcStr = func.toString();
    let isGeneratorFunction = isGeneratorRegExp.test(funcStr);

    if (isGeneratorFunction) {
      func = co.wrap(func);
    }

    func.call(res.gu.context, req, res, function () { //connect中间件next函数
      callNextMiddleware(middlewareCallbacks, controller, req, res, finalCallback);
    });
  } else {
    finalCallback && finalCallback();
  }
}

exports.resolveController = function (app, controllersDir, controllerName) { //按照路径，动态加载对应的controller，并缓存该controller
  app.gu = app.gu || {};
  app.gu.controllers = app.gu.controllers || {};

  let pathToController = path.join(controllersDir, controllerName + controllerAffix);
  let controller = app.gu.controllers[pathToController];

  if (!controller) {
    let Controller = require(pathToController); //动态加载对应controller的构造函数

    controller = new Controller(app); //实例化controller

    app.gu.controllers[pathToController] = controller;
  }

  return controller;
};

exports.executeController = function (executeContext, finishedCallback) { //finishedCallback
  let controller = executeContext.controller;
  let action = executeContext.action;
  let verb = executeContext.verb;
  let req = executeContext.req;
  let res = executeContext.res;
  let next = executeContext.next;
  let context = {
    viewBag: viewBag.bind(res),
    app: controller.app
  };

  res.gu = {
    status: {
      reachedAction: false,
      reachedEvents: false,
      finished: false
    },
    context: context //express实例和视图集合
  };

  let commonFuncList = ['render', 'json', 'jsonp', 'send', 'sendFile', 'download', 'redirect', 'end'];

  commonFuncList.forEach(function (item) { //重载express框架封装后的res对象常用的方法
    overrideResultFunction(item, controller, req, res, finishedCallback);
  });

  let middlewareCallbacks = [];

  controller.listeners('actionExecuting').forEach(function (listener) {
    middlewareCallbacks.push(listener);
  });

  (controller.filters || []).forEach(function (filter) {
    middlewareCallbacks.push(filter);
  });

  (action.filters || []).forEach(function (filter) {
    middlewareCallbacks.push(filter);
  });

  callNextMiddleware(middlewareCallbacks, controller, req, res, function () {
    res.gu.status.reachedAction = true;

    let funcStr = action[verb].toString();
    let isGeneratorFunction = isGeneratorRegExp.test(funcStr);

    if (isGeneratorFunction) {
      action[verb] = co.wrap(action[verb]);
    }

    action[verb].call(res.gu.context, req, res, function () { //next()被调用后执行，用来代替res.render，res.view，res.end等方法
      let actionExecutedCallbacks = [];

      controller.listeners('actionExecuted').forEach(function (listener) {
        actionExecutedCallbacks.push(listener);
      });

      callNextMiddleware(actionExecutedCallbacks, controller, req, res, function () {
        finishedCallback(next); //进入下一个中间件
      });
    });
  });
};