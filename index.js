'use strict';

var builder = require('./lib/builder');
var header = require('./lib/header');
var chrono = require('./lib/chrono');
var optionsChecker = require('./lib/options.checker');
function find(str,cha,num){
  var x=str.indexOf(cha);
  for(var i=0;i<num;i++){
    x=str.indexOf(cha,x+1);
  }
  return x;
}
function  getRoute(originalUrl,RoutePath) {
  var re = new RegExp("/","g");
  var route=RoutePath.match(re);
  if(route&& RoutePath!="/"){
    var arr1 = originalUrl.match(re).length-route.length;
    return originalUrl.substr(0,find(originalUrl,'/',arr1))+RoutePath;
  }else{
    return originalUrl;
  }
}
var expressMetricsStartTimeDate=new Date().getDate();
var clearEveryDay=false;
var filterPaths=[];
function filterPathsBool(regs,url) {
  if(regs.length<=0) return true;
  else {
      for (var i=0;i<regs.length;i++){
          var reg=new RegExp(regs[i],"g");
          if(reg.test(url)){ return true; break; }
      }
      return false;
    }
}


module.exports.expressMetrics = function expressMetrics(options) {
  var client;
  options = optionsChecker.check(options);
  builder.init(options);
  client = builder.getClient();

  header.init({ header: options.header });
  chrono.init({ decimals: options.decimals });
  clearEveryDay=options.clearEveryDay||false;
  filterPaths=options.filterPaths||[];
  expressMetricsStartTimeDate=new Date().getDate();
  return function (req, res, next) {
    // chrono.start();
    // if(new Date(json.syncTime).getDate()!=new Date().getDate())  return {};

    if(clearEveryDay&&(expressMetricsStartTimeDate!=new Date().getDate())){
      builder.getServer().setMetric({});
      expressMetricsStartTimeDate=new Date().getDate();
    }
    res.startAt = process.hrtime();
    res.startTime = new Date();
    // decorate response#end method from express
    var end = res.end;
    res.once('finish',function() {
      // var responseTime = new Date() - this.startTime;
      var diff = process.hrtime(this.startAt);
      var responseTime = diff[0] * 1e3 + diff[1] * 1e-6;
      header.setResponseTime(res, responseTime);
      var routePath=getRoute(req.originalUrl,req.route.path);
       if((filterPathsBool(filterPaths,routePath))&&res.statusCode>=200&&res.statusCode<300){

          client.send({
            route: { path: routePath, stack: req.route.stack, methods: req.route.methods },
            method: req.method,
            status: res.statusCode,
            time: responseTime
          });
      }
      else{
        client.send({
          route: { path: '*', stack: req.route.stack, methods: req.route.methods },
          method: req.method,
          status: res.statusCode,
          time: responseTime
        });
      }

    })
    next();
  };

};
module.exports.listen = function listen(port) {
  if (builder.getServer()) {
    return builder.getMetricsServer();
  }

  return builder.startServer(port);
};

module.exports.close = function close(callback) {
  builder.getServer().stop(callback);
};




module.exports.getMetricInsideObj = function getMetric(name) {
  if(clearEveryDay&&(expressMetricsStartTimeDate!=new Date().getDate())){
    builder.getServer().setMetric({});
    expressMetricsStartTimeDate=new Date().getDate();
    return {};
  }else{
    var trackedMetrics=builder.getServer().metrics.getReportSummaryInside()
    if(arguments.length<1){
      if(trackedMetrics)return trackedMetrics;
      else return {};
    }
    else {
      if(trackedMetrics[name]) return trackedMetrics[name];
      else return {};
    }
  }
};
module.exports.getMetricObj = function getMetric(name) {
  if(clearEveryDay&&(expressMetricsStartTimeDate!=new Date().getDate())){
    builder.getServer().setMetric({});
    expressMetricsStartTimeDate=new Date().getDate();
    return {};
  }else {
    var trackedMetrics=builder.getServer().metrics.getReportSummary()
    if(arguments.length<1){
      if(trackedMetrics)return trackedMetrics;
      else return {};
    }
    else {
      if(trackedMetrics[name]) return trackedMetrics[name];
      else return {};
    }
  }
};

module.exports.getMetric = function getMetric(name) {
  return builder.getServer().metrics.report.trackedMetrics;

};
module.exports.setMetric = function setMetric(trackedMetrics) {
  return builder.getServer().setMetric(trackedMetrics);
};

