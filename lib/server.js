var Metrics = require('metricsjs');
var logger = require('./logger');

var CATEGORIES = {
  all: 'global.all',
  static: 'global.static', // i.e. '/favicon.ico'
  status: 'status',
  method: 'method'
};

function initTimer(obj) {
  var t=new Metrics.Timer();
  t.updateInit(obj.duration,obj.rate);
  return t;
}
function initTrackedMetrics(trackedMetrics) {
  if(trackedMetrics.global) {
    var ntrackedMetrics={};
    for (namespace in trackedMetrics) {
      ntrackedMetrics[namespace] = {};
      for (name in trackedMetrics[namespace]) {
        ntrackedMetrics[namespace][name] = initTimer(trackedMetrics[namespace][name]);
      }
    }
    return ntrackedMetrics;
  }else return trackedMetrics;
}
function Server(port, statsd, statsdRoutes,trackedMetrics) {
  this.metrics = new Metrics.Server(port,initTrackedMetrics(trackedMetrics));
  this.statsd = statsd;
  this.statsdRoutes = statsdRoutes;
}
Server.prototype.getMetric=function () {
    return  this.metrics.report.trackedMetrics;
}
Server.prototype.setMetric=function (trackedMetrics) {
  return  this.metrics.report.trackedMetrics=trackedMetrics;
}
Server.prototype.getMetricName = function getMetricName(route, methodName) {
  var routeName = CATEGORIES.static;

  if (route && route.path) {
    routeName = route.path;

    if (Object.prototype.toString.call(routeName) === '[object RegExp]') {
      routeName = routeName.source;
    }

    routeName = routeName + '.' + methodName.toLowerCase();
  }

  return routeName;
};

Server.prototype.update = function update(message) {
  var metricName = this.getMetricName(message.route, message.method);
  var path = message.route ? message.route.path : undefined;

  this.updateMetric(CATEGORIES.all, message.time);
  this.updateMetric(CATEGORIES.status + '.' + message.status, message.time);
  this.updateMetric(CATEGORIES.method + '.' + message.method, message.time);
  if(path!=='*')this.updateMetric(metricName, message.time);

  if (this.statsd && this.statsdRoutes[path]) {
    var route = this.statsdRoutes[path];
    if (route.methods.indexOf(message.method) !== -1) {
      this.sendToStatsD(route.name, message.time);
    }
  }
};

Server.prototype.updateMetric = function updateMetric(name, time) {
  if (!this.metrics.report.getMetric(name)) {
    this.metrics.addMetric(name, new Metrics.Timer());
  }

  this.metrics.report.getMetric(name).update(time);
};


Server.prototype.sendToStatsD = function sendToStatsD(name, time) {
  this.statsd.timing('.' + name, time, null, function (error) {
    if (error) {
      logger.error('Error sending response time to StatsD: ', error);
    }
  });
};


Server.prototype.stop = function stop(callback) {
  this.metrics.server.close(callback);
};

module.exports = Server;
