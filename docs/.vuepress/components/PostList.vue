<template>
  <div v-if="Object.keys(postsByCategory).length" class="posts">
    <v-col
      class="px-0"
      cols="12"
      v-for="category in Object.keys(postsByCategory)"
      :key="category"
    >
      <v-card class="pa-5 px-md-7" elevation="1">
        <span class="primary--text text-h6 font-weight-bold" >{{ category }}</span>
        <span class="text-caption grey--text text--darken-1">({{ postsByCategory[category].length }})</span>
        <v-divider class="mt-4 mb-4" />

        <li v-for="post in postsByCategory[category]">
          <router-link :to="post.path">{{
            post.frontmatter.title
          }}</router-link>
          <span class="text-caption grey--text text--darken-1">{{ post.frontmatter.date }}</span>
        </li>
      </v-card>
    </v-col>
  </div>
</template>

<script>
export default {
  props: ["page"],
  computed: {
    postsByCategory() {
      let currentPage = this.page ? this.page : this.$page.path;
      let posts = this.$site.pages
        .filter((x) => {
          return x.path.match(new RegExp(`(${currentPage})(?=.*html)`));
        })
        .sort((a, b) => {
          return new Date(b.frontmatter.date) - new Date(a.frontmatter.date);
        });
      let postsByCategory = {};
      posts.forEach((post) => {
        let cat = post.frontmatter.category;
        if (cat in postsByCategory) {
          postsByCategory[cat].push(post);
        } else {
          postsByCategory[cat] = [post];
        }
      });
      return postsByCategory;
    },
  },
};
</script>

<style scoped></style>
