'use strict';

let fs = require('fs');
let path = require('path');
let fileWatcher = null;
const guthrieSettings = {
  defaultDirectories: {
    controllers: '/controllers',
    views: '/views',
    areas: '/areas'
  },
  viewsExt: '',
  controllerNameAffix: 'Controller',
  defaultAction: 'index',
  configFile: 'web.json'
};

function Config() {}

function loadDefaultGuthrieSettings() {
  this.guthrie = this.guthrie || {};
  Object.assign(this.guthrie, guthrieSettings, this.guthrie);
}

function configFileChanged(config, configPath) {
  fileWatcher && fileWatcher.close();

  fs.readFile(configPath, {encoding: 'utf8'}, function (err, data) {
    if (err) {
      console.log(err);
    }
    let configData = JSON.parse(data);

    Object.keys(config).forEach(function (key) {
      delete config[key];
    });

    Object.keys(configData).forEach(function (key) {
      config[key] = configData[key];
    });

    loadDefaultGuthrieSettings.call(config);

    fileWatcher = fs.watch(configPath, {persistent: false}, function () {
      configFileChanged(config, configPath);
    });
  });
}

/**
 * 用户自定义是否调用
 *
 * @param {Object} options
 */
Config.prototype.init = function (options) {
  let config = this;

  Object.keys(config).forEach(function (key) {
    delete config[key];
  });

  this.app = options.app; //express实例
  this.rootDir = options.rootDir; //项目根路径

  let configPath = path.join(this.rootDir, guthrieSettings.configFile); //自定义的配置文件

  fs.exists(configPath, function (isPathExist) {
    if (isPathExist) {
      fs.readFile(configPath, {encoding: 'utf8'}, function (err, data) {
        if (err) {
          console.log(err);
        }

        let configData = JSON.parse(data);

        Object.keys(configData).forEach(function (key) {
          config[key] = configData[key];
        });

        fileWatcher = fs.watch(configPath, {persistent: false}, function () {
          configFileChanged(config, configPath);
        });
      });
    }
  });

  loadDefaultGuthrieSettings.call(config);
};

module.exports = new Config();