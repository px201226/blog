import Vuetify from "vuetify";
import "./theme/vuetify.css"
import "./theme/prism-tomarrow.css"

export default ({
  Vue, // the version of Vue being used in the VuePress app
  options, // the options for the root Vue instance
  router, // the router instance for the app
  siteData // site metadata
}) => {
  Vue.use(Vuetify);
  options.vuetify = new Vuetify({
    theme: {
      themes: {
        light: {
          primary: '#2673bf',
          secondary: '#b0bec5',
          accent: '#8c9eff',
          error: '#b71c1c',
          background: '#1E88E5',
        },
      },
    },
})
};