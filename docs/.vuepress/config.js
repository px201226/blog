var path = require('path');

module.exports = {
  title: "px201226' devlogs",
  description: 'Awesome description',
  base: '/blog/',
  chainWebpack: (config, isServer) => {
    config.resolveLoader.modules.add(path.resolve(__dirname, './node_modules'));
  },
  head: [
    [
      'script',
      { src: 'https://www.googletagmanager.com/gtag/js?id=UA-139141353-1' }
    ]
  ],


}
