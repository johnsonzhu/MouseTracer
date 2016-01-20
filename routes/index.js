var express = require('express');
var router = express.Router();
var Redis = require('ioredis');
var async = require('async');
var calculate = require('./calculate');
var debug = require('debug');

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//  HLEN获得字段数量的方式不太安全…… 还是设counter比较好
//  TODO: 把pipeline改成multi以保证安全性
router.post('/verify',function(req, res, next) {
  var redis = new Redis();
  redis.get("counter", function(err, counter) {
      if (err) throw(err);
      var key = "trace:" + counter;
      var pipeline = redis.pipeline();
      pipeline.hset(key, "trace", JSON.stringify(req.body.traceArray));
      pipeline.hset(key, "ip", req.ip);
      pipeline.hset(key, "timestamp", Date.now());
      pipeline.hget("client_ip:" + req.ip, "counter", function(err, value){
          var pipeline_1 = redis.pipeline();
          if(!value){
              // 在ip列表里面登记一下
              pipeline_1.hget("client_ip_set", "counter", function(err, value){
                  var pipeline_2 = redis.pipeline();
                  pipeline_2.hset("client_ip_set", "ip_id:" + value, req.ip);
                  pipeline_2.hincrby("client_ip_set", "counter", 1);
                  pipeline_2.exec();
              });
              // 初始化
              pipeline_1.hset("client_ip:" + req.ip, "counter", 0);
              value = 0;
          }
          pipeline_1.hset("client_ip:" + req.ip, "key:" + value, "trace:" + counter);
          pipeline_1.hincrby("client_ip:" + req.ip, "counter", 1);
          pipeline_1.exec();
      })
      pipeline.incr("counter");
      pipeline.exec(function(err, values){
          calculate(req.body.traceArray);
          res.send("aaa").end();
      });
   });
});

router.get('/delete/all/saved/traces', function(req, res, next) {
  var redis = new Redis();
  redis.get("counter", function(err, counter) {
    for(var i = 0; i < counter; i++){
        redis.del("trace:" + i);
        console.log(i);
    }
    redis.del("trace:" + counter);
    redis.set("counter", 0);
    redis.hget("client_ip_set", "counter", function(err, value){
        for(var i = 0; i < counter; i++){
            redis.hget("client_ip_set", "ip_id:" + i, function(err, value){
                redis.del("client_ip:" + value);
                console.log(i);
            });
            redis.hdel("client_ip_set", "ip_id:" + i);
        }
        redis.hset("client_ip_set", "counter", 0, function(err,value){
            res.send("233").end();
        });
    });
  });
});

router.get('/tests', function(req, res, next) {
    var n = [];
    n[1] = {
            "x": "1",
            "y": "y",
            "time": "timer"
        };
    console.log(n[1].x);
    res.end();
});

module.exports = router;