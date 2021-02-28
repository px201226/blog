var path = require('path');

module.exports = {
  title: "DEVUP",
  description: 'Awesome description',

  chainWebpack: (config, isServer) => {
    config.resolveLoader.modules.add(path.resolve(__dirname, './node_modules'));
  },
  head: [
    [
      'script',
      { src: 'https://www.googletagmanager.com/gtag/js?id=G-SE0BLFFFMG' }
    ]
  ],

  markdown: {
    lineNumbers: true
  },

  plugins: [
    [
      '@vuepress/google-analytics',
      {
        'ga': 'G-SE0BLFFFMG'
      },
    ],
    ["sitemap", { hostname: "https://px201226.github.io/" }]
  ]
}
