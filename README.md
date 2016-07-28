guthrie.js
==========

原作者：Dominic Pettifer &lt;sironfoot@gmail.com&gt;

原框架地址：https://github.com/Sironfoot/guthrie.js

guthrie.js是一个构建在express框架之上的Node.js MVC框架，其灵感来源于微软的ASP.NET MVC。

**注意：** guthrie-js v0.0.4，从框架层面上开始支持generator和promise

guthrie框架将你的代码组织到controllers、actions中，支持filters和events功能。你可以认为controller是某物体的名称（如product， category， order等），actions则是一系列动作（如show，edit， remove等）。


## Installation

    $ npm install express
    $ npm install guthrie-js


## Quick Start

将guthrie添加到一个已存在的express应用程序中:

````javascript
var express = require('express');
var gu = require('guthrie-js');

var app = express();
//... 插入中间件函数
app.use(app.router);

var router = new gu.Router(app, __dirname);

router.mapRoute('/', {
    controller: 'home',
    action: 'index'
});

router.mapRoute('/product/:id/:name', {
    controller: 'product',
    action: 'detail'
});

http.createServer(app).listen(3000);
````

上面的代码可以将路由映射到home和product这两个控制器上。每个控制器可以有一个或多个'actions'。如上面的示例，我们已经将路径'/'映射到控制器(controller)home的动作(action)index上。

根据规范，controllers必须放置在你项目根路径下的'/controllers'文件夹内，而且每个控制器文件必须以'Controller.js'为后缀命名。所以，让我们在'/controllers'文件夹下创建一个'homeController.js'文件。

````javascript
var gu = require('guthrie-js');

var homeController = gu.controller.create();
homeController.actions = {
    
    // PATH: /
    index: {
        GET: function(req, res) {
            res.view();
        }
    }
};

module.exports = homeController;
````

res.view()是一个guthrie框架扩展的函数，其功能基本和res.render()一样，不同之处在于，res.view()会假定该controller对应的view视图为'/views/controllerName/actionName'。所以，我们上面的例子，res.view()会按照'/views/home/index.html'这个路径来寻找对应的view视图。

上面的例子，我们为GET请求创建了一个GET方法来对请求作出处理。guthrie框架同样支持POST、PUT、DELETE类型的请求。


## More on Routes

当定义路由时，你可以将controller和action作为参数包含在路由中:

    router.mapRoute('/product/:action/:id', { controller: 'product' });

如上，URL '/product/edit/123'将匹配'product' controller和'edit' action。实际开发中，表达式'/controller/action/id'是一个很常用的模式，所有你可以通过下面的代码来覆盖所有'controllers/actions'模式的路径:

    router.mapRoute('/:controller/:action?/:id?');

注意，上面代码中'?'，代表action和id为可选项。guthrie框架中，action的默认值为'index'，所以，如果你没有明确指定action，URL '/product'将映射到'product' controller的'index' action上。

**警告:** 默认情况下， express(1)会将路由中间件放置在静态文件（static）中间件前面。因此，上面的路由会匹配你的前端脚本和样式表，所以记得改变一下次序:

    app.use(express.static(path.join(__dirname, 'public')));
    app.use(app.router);


## Action Filters

Action Filters为通用的工作（例如:检测用户是否登录）,提供了复用的功能。filters可被放置在controllers上，来为controller上所有actions或个别actions服务。

将filters放置在controller上:

````javascript
var accountController = gu.controller.create({
    filters: [ filters.mustBeLoggedIn ]
});
````

将filters放置在个别action上:

````javascript
var accountController = gu.controller.create();
accountController.actions = {
    
    // PATH: /account/login
    login: {
        GET: function(req, res) {
            res.view();
        }
    }
    
    // PATH: /account/orders
    orders: {
        filters: [ filters.mustBeLoggedIn ],
        
        GET: function(req, res) {
            res.view();
        }
    }
};
````

让我们看看对'mustBeLoggedIn'的实现:

````javascript
exports.mustBeLoggedIn = function(req, res, next) {
    
    if (!res.session.loggedInUser) {
        res.redirect('/account/login');
    }
    else {
        next();
    }
};
````

Filters的工作方式类似于connect中间件。你可以为每个controller和action定义多个filters。filters将会在任何actions执行之前按顺序依次执行。
因为，它们一个一个的按次序被调用，你必须记得调用next()来表明下一个filter应当被执行，除了你自己想停止继续向后执行，从而可以立刻向浏览器发送结果(参考上面的res.redirect())。


## Events

Controllers支持四种标准的事件:

* actionExecuting - 在action执行之前被调用
* actionExecuted - 在action执行之后被调用
* resultExecuting -  在result执行之前被调用
* resultExecuted - 在result执行之后被调用

result指的是HttpResponse对象上任何向浏览器发送结果的方法，例如:res.end()，res.render()，res.view()，res.redirect()等。

````javascript
var homeController = gu.controller.create();

homeController.on('actionExecuting', function(req, res, next) {
    // Do something for all actions in the home controller
    next();
});
````

类似Filters，Events的工作方式同样类似于connect中间件，各函数依次被调用，所以，记得调用next()。


## Controller Inheritance

你可以创建一个base controller，然后让所有其它controllers继承它。

````javascript
var baseController = new gu.controller.create();
module.exports = baseController;
````

````javascript
var baseController = require('./baseController');

var homeController = new gu.controller.inherit(baseController, {
    filters: [ /* optional filters */ ]
});
````

Controller继承机制，可以让你定义Events和Filters，然后让它们为应用程序中的所有controllers/actions服务。例如，一个web应用通常都有一个base/root布局模板(或partial views)，
它被包含在网站中的各个页面中，该base/root布局模板(或partial views)有一些通用的业务逻辑，与其在每个不同的action中处理同样的业务逻辑，不如将这些通用的业务逻辑放置在base controller中:

````javascript
var baseController = new gu.controller.create();

baseController.on('actionExecuting', function(req, res, next) {
    db.getCategories(function(err, categories) {
        if (err) throw err;
    
        res.locals.categories = categories;
        next();
    });
});

module.exports = baseController;
````

上面的代码,如果你确保应用中的每个controller都继承自base controller，那么该web应用程序中的每个模板在渲染之前都会有个categories属性。


## Areas

和ASP.NET MVC一样,你可以将你的代码按照区块(Areas)进一步细分。每个Areas通过设置自己的controllers和views来成为独立的功能单元,通常通过URL前缀来访问这些Areas(例如:/admin)。

在你应用程序的入口app.js中设置一个area:

````javascript
var router = new gu.Router(app, __dirname);

var adminArea = router.createArea('admin');
adminArea.mapRoute('/admin', { controller: 'home', action: 'index' });
adminArea.mapRoute('/admin/:controller/:action?/:id?');

// normal routes here (snip)...
````

在上面的代码中,我们定义了一个'admin' area。根据规范,guthrie.js将会在'/areas'文件夹中寻找'/admin'文件夹,并且预期在'/admin'文件夹中可以找到'/controllers'和'/views'文件夹,所以你项目的文件夹结构应该和下面的结构类似:

* app.js
* areas
	* area1
		* controllers
		* views
	* area2
		* controllers
		* views

每个controller对应的文件,按照先前的规范继续创建。调用res.view()可以在area的'/views'文件中正确的找到对应的视图view。


## 'this' Context in Filters, Events and Actions

每个Filter,Event,Action在运行时,都有一个this上下文环境。在处理某个HTTP请求的整个过程中该this上下文环境一直存在。你可以向该this上下文添加属性,这些你添加的属性可以在随后的filters/events/actions中使用:

````javascript
homeController.on('actionExecuting', function(req, res, next) {
    this.user = 'Scott Guthrie';
    next();
});

homeController.actions = {
    index: {
        filters: [
            function(req, res, next) {
                this.clothing = 'Red polo shirt'
                next();
            }
        ],
        GET: function(req, res, next) {
            console.log(this.user); // Outputs 'Scott Guthrie'
            console.log(this.clothing); // Outputs 'Red polo shirt'
            
            res.end();
        }
    }
};
````

this上下文有几个非常有用的属性供你使用:

* this.app - 返回Express实例
* this.viewBag() - 一个可以在locals对象上添加属性的帮助函数(原框架中该函数的函数名为'viewbag',在本fork版本中改名为'viewBag',以期遵循驼峰命名规则)

上面的viewBag()函数可以像下面这样调用:

    this.viewBag().user = 'Scott Guthrie';

...在某个view/template中:

    <p class="user"><%= viewBag.user %></p>


## Sample E-commerce App

在本git仓库的'/examples/ecommerce'目录下,你可以看到一个用express和guthrie.js来实现的简单电子商务应用。


## Coming Soon

* Web.config files


## About the name

guthrie.js is named after Scott Guthrie who is the corporate vice president of the Microsoft Developer Division. He created the original ASP.NET MVC in Februrary 2007 while flying on plane to a conference on the East Coast of the USA.


## License 

(The MIT License)

Copyright (c) 2013 Dominic Pettifer &lt;sironfoot@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
