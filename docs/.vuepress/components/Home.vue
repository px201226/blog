<template>
  <div v-if="postsForPage.length" class="posts">
    <v-col class="px-0" cols="12" v-for="post in postsForPage" :key="post.path">
      <v-card class="pa-5" elevation="2">
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
          <span class="post-date">{{ post.frontmatter.date }}</span>
        </div>
        <v-divider class="mt-4 mb-4" />
        <div v-html="post.excerpt"></div>
        <router-link :to="post.path">Read more....</router-link>
      </v-card>
    </v-col>

    <br />
    <v-row justify="center" class="pa-10">
      <v-btn
        color="primary"
        style="width: 50%; height: 48px;"
        v-on:click="increasePageNum(-1)"
        >이전 페이지</v-btn
      >
      <v-btn
        color="primary"
        style="width: 50%; height: 48px;"
        v-on:click="increasePageNum(1)"
      >
        다음 페이지
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
  },
  methods: {
    increasePageNum(amount) {
      if (
        this.pageNum + amount >= 1 &&
        this.pageNum + amount <= this.totalPage
      ) {
        this.pageNum += amount;
      }

      console.log(this.totalPage);
      console.log(this.pageNum);
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
