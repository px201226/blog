<template>
  <v-app id="app" style="background: #f0eeee" >
    <v-container style="max-width: 900px;" class="pa-0">
      <link
        href="https://fonts.googleapis.com/css?family=Jura"
        rel="stylesheet"
      />
      <v-app-bar-title class="text-center py-8" style="font-family: 'Jura'">
        <h1 class="primary--text">{{ $site.title }}</h1>
      </v-app-bar-title>
     
      <v-list flat class="pa-0" color="transparent">
      <v-list-item-group
        color="indigo"
      >
      <v-row class="mb-0 text-center" justify="center" no-gutters>
        <v-col lg="2">
          <v-list-item class="py-2 " block text color="primary" to="/">
            <v-list-item-title>Home</v-list-item-title>
          </v-list-item>
        </v-col>
         <v-col lg="2">
          <v-list-item class="py-2" block text color="primary" to="/category">
            <v-list-item-title>Category</v-list-item-title>
          </v-list-item>
         </v-col>
          <v-col lg="2">
          <v-list-item class="py-2" block text color="primary" to="/profiles">
            <v-list-item-title>Profiles</v-list-item-title>
          </v-list-item>
          </v-col>
        </div>
        </v-row>
      </v-list-item-group>
    </v-list>

      <v-divider class="mb-3" />

      <div>
        <component :is="$page.frontmatter.layout" />
      </div>
       </v-container>

    <Footer class="mt-2" />
  </v-app>
</template>

<script>
import Footer from "../../components/Footer.vue";
export default {
  components: { Footer },
  data() {
    return {};
  },
  computed: {
    activeIndex() {
      return this.page ? this.page : this.$page.path;
    },
  },
  mounted() {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());
    gtag("config", "UA-139141353-1");
  },
};
</script>

<style src="../../public/less/style.less" lang="less"></style>
<style src="../markdown.css"></style>
<style >
#app {
  font-family: "Noto Sans KR", sans-serif;
}
</style>