'use strict';

let path = require('path');
let routerUtils = require('./utils/routerUtils');
const defaultDirectories = {
  controllers: 'controllers',
  views: 'views',
  areas: 'areas'
};
const defaultRequest = {
  action: 'index',
  method: 'GET'
};

/**
 * 扩展express实例，并将扩展后的express实例挂载到Router实例的app属性上
 *
 * @param {Object} app express实例
 * @param {String} rootDir 项目根路径
 * @param {Object} options 项目自定义配置,如分区文件夹配置
 * options = {
 *  areaName: '',
 *  areaDir: '',
 *  controllersDir: '',
 *  viewsDir: ''
 * }
 */
function Router(app, rootDir, options = {}) {
  this.rootDir = rootDir;
  this.controllersDir = options.controllersDir || path.join(this.rootDir, defaultDirectories.controllers);
  this.viewsDir = options.viewsDir || path.join(this.rootDir, defaultDirectories.views);

  app.gu = app.gu || {};
  app.gu.controllers = app.gu.controllers || {};
  app.gu.areas = app.gu.areas || {};

  if (options.areaName && options.areaDir) { //根据用户定义,决定是否将项目进一步模块化
    app.gu.areas[options.areaName] = {
      dir: options.areaDir,
      controllersDir: options.controllersDir,
      viewsDir: options.viewsDir
    };
  } else { //普通模式
    app.gu.rootDir = this.rootDir;
    app.gu.controllersDir = this.controllersDir;
    app.gu.viewsDir = this.viewsDir;

    let viewsExt = (options.viewsExt || app.get('view engine') || '').trim();

    viewsExt = viewsExt.slice(0, 1) === '.' ? viewsExt.slice(1) : viewsExt;

    app.gu.viewsExt = viewsExt.length > 0 ? ('.' + viewsExt) : '';
  }

  this.app = app; //将扩展后的express实例挂载到Router实例的app属性上
}

/**
 * 植入中间件函数
 * 中间件函数，分配路由到对应的controller和action上，按照路径加载controller
 * 当请求路径合法时，执行绑定在指定controller上的一系列有效方法
 *
 * @param {String} route 路径字符串
 * route的默认规范为：'/:controller/:action'
 * @param {Object} routeParams 用户自定义controller,action
 * routeParams = {
 *   controller: 'test',
 *   action: 'index'
 * }
 */
Router.prototype.mapRoute = function (route, routeParams = {}) {
  let router = this;

  router.app.all(route, function (req, res, next) { //express框架中间件函数，每当接收到请求时执行
    let controllerName = req.params.controller || routeParams.controller;
    //按照路径加载controller
    let controller = routerUtils.resolveController(router.app, router.controllersDir, controllerName);

    if (!controller) {
      next();
      return;
    }

    let actionName = req.params.action || routeParams.action || defaultRequest.action;
    let action = controller.actions[actionName];

    if (!action) {
      next();
      return;
    }

    //合法的请求类型,GET POST PUT DELETE
    let verb = (req.method || defaultRequest.method).toUpperCase();

    if (!action[verb]) {
      next();
      return;
    }

    //扩展res对象,使用guthrie路由系统配置的路径,自动化渲染视图
    res.view = function (locals, callback) {
      let viewFile = actionName + this.app.gu.viewsExt;
      let view = path.join(router.viewsDir, controllerName, viewFile);

      res.render(view, locals, callback);
    };

    let executeContext = {
      controller: controller,
      action: action,
      verb: verb,
      req: req,
      res: res,
      next: next
    };

    routerUtils.executeController(executeContext, function (next) { //执行绑定在controller上的一系列有效方法
      if (next) {
        next();
      }
    });
  });
};

/**
 * 生成子分区对应的router实例
 *
 * @param {String} areaName 分区名称
 * @param {Object} options
 * options = {
 *  dir: '/area1' //用户自定义子分区路径
 * }
 * @return {Object} router
 */
Router.prototype.createArea = function (areaName, options = {}) {
  let areaDir = options.dir || path.join(this.rootDir, defaultDirectories.areas, areaName);
  let router = new Router(this.app, this.rootDir, {
    controllersDir: path.join(areaDir, defaultDirectories.controllers),
    viewsDir: path.join(areaDir, defaultDirectories.views),
    areaName: areaName,
    areaDir: areaDir
  });

  delete router.createArea;

  return router;
};

module.exports = Router;