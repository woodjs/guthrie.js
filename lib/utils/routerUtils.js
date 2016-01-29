'use strict';

let path = require('path');
const controllerAffix = 'Controller.js';

function viewBag() {
  this.locals.viewBag = this.locals.viewBag || {};

  return this.locals.viewBag;
}

/**
 * 重载express包装的res.render，res.send，res.json，res.end等结果方法
 *
 * @param resultFunc
 * @param controller
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

        callNextMiddleware(middlewareCallbacks, controller, req, res, function () {
          func.apply(res, args); //调用原始方法

          let resultExecutedCallbacks = [];

          controller.listeners('resultExecuted').forEach(function (listener) {
            resultExecutedCallbacks.push(listener);
          });

          callNextMiddleware(resultExecutedCallbacks, controller, req, res, function () {
            finishedCallback(null);
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
    func.call(res.gu.context, req, res, function () {
      callNextMiddleware(middlewareCallbacks, controller, req, res, finalCallback);
    });
  } else {
    finalCallback && finalCallback();
  }
}

exports.resolveController = function (app, controllersDir, controllerName) { //按照路径，动态加载对应的controller
  app.gu = app.gu || {};
  app.gu.controllers = app.gu.controllers || {};

  let pathToController = path.join(controllersDir, controllerName + controllerAffix);
  let controller = app.gu.controllers[pathToController];

  if (!controller) {
    let Controller = require(pathToController); //动态加载对应的controller

    controller = new Controller(app);

    app.gu.controllers[pathToController] = controller;
  }

  return controller;
};

exports.executeController = function (executeContext, finishedCallback) {
  let {controller, action, verb, req, res, next} = executeContext;
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

  commonFuncList.forEach(function (item) { //重载常用的res方法
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

    action[verb].call(res.gu.context, req, res, function () { //next()被调用后执行，用来代替res.render，res.view，res.end等方法
      let actionExecutedCallbacks = [];

      controller.listeners('actionExecuted').forEach(function (listener) {
        actionExecutedCallbacks.push(listener);
      });

      callNextMiddleware(actionExecutedCallbacks, controller, req, res, function () {
        finishedCallback(next);
      });
    });
  });
};