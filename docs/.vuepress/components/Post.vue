<template>
  <div>
    <v-col cols="12" class="px-0">
      <v-card class="pa-5" elevation="1">
        <div>
          <router-link class="text-h6 font-weight-bold" :to="$page.path">
            <div>
              <img
                v-if="$page.frontmatter.image"
                :src="$withBase($page.frontmatter.image)"
                alt
              />
            </div>
            {{ $page.frontmatter.title }}
          </router-link>
          <br />
          <span
            v-if="$page.frontmatter.category"
            class="text-caption grey--text text--darken-1 "
            >{{ $page.frontmatter.date }} > {{ $page.frontmatter.category }}
          </span>
        </div>

        <v-divider class="mt-4 mb-4" />
        <div class="theme-container">
          <!--   <Content class="theme-default-content custom" /> -->
          <Content class="theme-default-content custom post markdown-body" />
        </div>
      </v-card>
    </v-col>
    <Comment />
  </div>
</template>

<script>
import Comment from "./Comment.vue";
export default {
  components: { Comment },

  created() {
    console.log("Post");
  },
};
</script>

<style scoped></style>
