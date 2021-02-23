<template>
  <div style="wrapper">
    <el-container style="max-width: 900px; margin: 0px auto; main-content">
      <link
        href="https://fonts.googleapis.com/css?family=Jura"
        rel="stylesheet"
      />
      <el-header class="blog-header" height="100px">
        <h1>{{ $site.title }}</h1>
      </el-header>

      <el-menu
        :router="true"
        :default-active="activeIndex"
        class="el-menu-demo"
        background-color="#f9fafc"
        type="flex"
        justify="center"
      >
        <el-row type="flex" justify="center">
          <el-col :xs="6" :md="4">
            <el-menu-item index="/">메인</el-menu-item>
          </el-col>
          <el-col :xs="6" :md="4">
            <el-menu-item index="/posts/">카테고리</el-menu-item>
          </el-col>
          <el-col :xs="6" :md="4">
            <el-menu-item index="/profiles/">프로필</el-menu-item>
          </el-col>
        </el-row>
      </el-menu>

      <div>
        <component :is="$page.frontmatter.layout" />
      </div>
    </el-container>

    <Footer />
  </div>
</template>

<script>
import Vue from "vue";
import ElementUI from "element-ui";
import Prism from "prismjs";
import "element-ui/lib/theme-chalk/index.css";
import locale from "element-ui/lib/locale/lang/ko";
import Footer from "../../components/Footer.vue";

Vue.use(Prism);
Vue.use(ElementUI, { locale });

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
<style src="prism-themes/themes/prism-a11y-dark.css"></style>
<style src="../../public/less/style.less" lang="less">
</ > <style scoped > .wrapper {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}
.main-content {
  flex: 1;
}
</style>
