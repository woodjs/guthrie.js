'use strict';

let events = require('events');
let util = require('util');

util.inherits(Controller, events.EventEmitter);

function Controller() {} //原始继承nodejs事件系统,该构造函数并无实质作用

/**
 * 生成自定义的controller构造函数
 *
 * @param {Function} BaseController
 * @param {Object} config 装载filters函数列表
 * config = {
 *  filters: [func1, func2, ...]
 * }
 * @return {Function} _Controller
 */
function createController(BaseController, config) {
  return (function (BaseController, config) {
    let _config = config || {};
    /**
     * 实际返回的controller构造函数
     * 将构造函数以及父类暂存的方法属性等，移植到controller实例上
     *
     * @param {Object} app 扩展后express实例
     */
    let _Controller = function (app) {
      this.app = app;
      this.filters = [];
      this.actions = {};

      let controller = this;

      _Controller.events.forEach(function (event) { //将构造函数上暂存的事件对象,移植到实例对象上
        controller.on(event.name, event.callback);
      });

      _Controller.filters.forEach(function (filter) {
        controller.filters.push(filter);
      });

      Object.keys(_Controller.actions || {}).forEach(function (key) {
        let actionMethod = _Controller.actions[key]; //actionMethod,实现RESTful接口的对象

        if (actionMethod.GET || actionMethod.POST || actionMethod.PUT || actionMethod.DELETE) {
          controller.actions[key] = actionMethod;
        }
      });

      if (BaseController) {
        let baseController = new BaseController(app);

        Object.keys(baseController.actions || {}).forEach(function (key) {
          let actionMethod = baseController.actions[key];

          if (actionMethod.GET || actionMethod.POST || actionMethod.PUT || actionMethod.DELETE) {
            if (!controller.actions[key]) {
              controller.actions[key] = actionMethod;
            }
          }
        });
      }
    };

    util.inherits(_Controller, Controller); //继承事件系统

    _Controller.filters = []; //暂存过滤中间件函数
    _Controller.events = [];
    _Controller.actions = {};

    if (BaseController) {
      (BaseController.events || []).forEach(function (event) {
        _Controller.events.push(event);
      });

      (BaseController.filters || []).forEach(function (filter) {
        _Controller.filters.push(filter);
      });
    }

    //express支持的事件：actionExecuting，actionExecuted，resultExecuting，resultExecuted
    _Controller.on = function (event, callback) { //controller构造函数上暂存事件对象
      _Controller.events.push({name: event, callback: callback});
    };

    (_config.filters || []).forEach(function (filter) {
      _Controller.filters.push(filter);
    });

    return _Controller;
  })(BaseController, config);
}

exports.create = function (config) {
  return createController(null, config);
};

exports.inherit = function (BaseController, config) {
  return createController(BaseController, config);
};