<template>
  <div v-if="postsForPage.length">
    <v-col class="px-0" cols="12" v-for="post in postsForPage" :key="post.path">
      <v-card class="pa-5 " elevation="1">
        <div>
          <router-link class="text-h6 font-weight-bold" :to="post.path">
            <div>
              <img
                v-if="post.frontmatter.image"
                :src="$withBase(post.frontmatter.image)"
                alt
              />
            </div>
            {{ post.frontmatter.title }}
            <br />
          </router-link>
          <span class="text-caption grey--text text--darken-1 ">{{
            post.frontmatter.date
          }} > {{post.frontmatter.category}} </span>
        </div>
        <v-divider class="mt-4 mb-4" />
        <div class="markdown-body post mb-3" v-html="post.excerpt"></div>
        <router-link :to="post.path">Read more ></router-link>
      </v-card>
    </v-col>

    <br />
    <v-row justify="center" class="py-5 px-15 ">
      <v-btn
        v-if="isNotEndPage"
        elevation="1"
        block
        rounded
        color="white"
        class="grey--text text--darken-1"
        v-on:click="increasePageNum(1)"
        >↓    더 보기
      </v-btn>
    </v-row>
  </div>
</template>

<script>
export default {
  props: ["page"],
  created() {
    console.log("Home");
  },
  computed: {
    posts() {
      let currentPage = this.page ? this.page : this.$page.path;
      let posts = this.$site.pages
        .filter((x) => {
          return x.path.match(new RegExp(`(${currentPage})(?=.*html)`));
        })
        .sort((a, b) => {
          return new Date(b.frontmatter.date) - new Date(a.frontmatter.date);
        });

      this.postLength = posts.length;
      this.totalPage = Math.ceil(this.postLength / this.postPerPage);
      return posts;
    },
    postsForPage() {
      let postIndex = (this.pageNum - 1) * this.postPerPage;
      return this.posts.slice(postIndex, postIndex + this.postPerPage);
    },

    isNotEndPage() {
      return this.postPerPage <= this.postLength;
    },
  },
  methods: {
    increasePageNum(amount) {
      if (
        this.pageNum + amount >= 1 &&
        this.pageNum + amount <= this.totalPage
      ) {
        //this.pageNum += amount;
        this.postPerPage += 5;
      }
    },
  },

  data() {
    return {
      totalPage: 0, // 총 페이지 갯수
      postLength: 0, // 총 게시물 수
      pagePerPage: 10, // 페이지 당 보여질 페이지 수
      postPerPage: 5, // 페이지 당 게시물 수
      pageNum: 1, // 현재 페이지 번호
      startPage: 1,
      endPage: 1,
    };
  },
};
</script>
