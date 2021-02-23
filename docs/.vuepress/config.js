var path = require('path');

module.exports = {
  title: "px201226's devlogs",
  description: "px201226's devlogs",
  chainWebpack: (config, isServer) => {
    config.resolveLoader.modules.add(path.resolve(__dirname, './node_modules'));
  },
  head: [
    [
      'script',
      { src: 'https://www.googletagmanager.com/gtag/js?id=UA-139141353-1' }
    ]
  ],


};
