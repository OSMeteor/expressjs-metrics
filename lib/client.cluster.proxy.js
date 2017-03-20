'use strict';

function ClientClusterProxy() {
}

ClientClusterProxy.prototype.forwardMessage = function forwardMessage(message) {
  message.cmd = 'expressjs-metrics';
  process.send(message);
};

module.exports = ClientClusterProxy;
