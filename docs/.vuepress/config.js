var path = require('path');

module.exports = {
  title: "DEVUP",
  description: 'Awesome description',
  themeConfig: {
    navbar: false,
    sidebar: false,
    search: false,

  },

  chainWebpack: (config, isServer) => {
    config.resolveLoader.modules.add(path.resolve(__dirname, './node_modules'));
  },
  head: [
    [
      'script',
      { src: 'https://www.googletagmanager.com/gtag/js?id=UA-139141353-1' }
    ]
  ],

  markdown: {
    lineNumbers: true
  }
}
