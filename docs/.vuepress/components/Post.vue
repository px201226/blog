<template>
  <div>
    <v-col cols="12" class="px-0 post">
      <v-card class="pa-5" elevation="2">
        <div>
          <router-link :to="$page.path" class="post-link">
            <div>
              <img
                v-if="$page.frontmatter.image"
                :src="$withBase($page.frontmatter.image)"
                alt
              />
            </div>
            {{ $page.frontmatter.title }}
            <br />
            <span class="post-date">{{ $page.frontmatter.date }}</span>
          </router-link>
        </div>

        <v-divider class="mt-4 mb-4" />

        <Content class="markdown-body" />
      </v-card>
    </v-col>
    <disqus />
  </div>
</template>

<script>
export default {
  created() {
    console.log("Post");
  },
};
</script>

<style scoped></style>
