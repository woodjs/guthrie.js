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
  defaultAction: 'index'
};

function Config() {}

function loadDefaultGuthrieSettings() {
  this.guthrie = this.guthrie || {};
  Object.assign(this.guthrie, guthrieSettings, this.guthrie);
}

function configFileChanged(config, configPath) {
  fileWatcher.close();

  fs.readFile(configPath, {encoding: 'utf8'}, function (err, data) {
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

Config.prototype.init = function (options) {
  let config = this;

  Object.keys(config).forEach(function (key) {
    delete config[key];
  });

  this.app = options.app;
  this.rootDir = options.rootDir;

  //TODO
  let configPath = path.join(this.rootDir, 'web.json');
  let isPathExist = fs.existsSync(configPath);

  if (isPathExist) {
    let json = fs.readFileSync(configPath, {encoding: 'utf8'});
    let configData = JSON.parse(json);

    Object.keys(configData).forEach(function (key) {
      config[key] = configData[key];
    });

    fileWatcher = fs.watch(configPath, {persistent: false}, function () {
      configFileChanged(config, configPath);
    });
  }

  loadDefaultGuthrieSettings.call(config);
};

module.exports = new Config();