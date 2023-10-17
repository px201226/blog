import React from "react"
import _ from "lodash"
import {graphql} from "gatsby"

import Layout from "components/Layout"
import SEO from "components/SEO"
import Bio from "components/Bio"
import PostList from "components/PostList"
import PageIndex from "components/PageIndex"
import SideTagList from "components/SideTagList"
import Divider from "components/Divider"
import VerticalSpace from "components/VerticalSpace"

import {title, description, siteUrl} from "../../blog-config"

const PostPagination = ({data, pageContext}) => {

  const posts = data.paging.nodes
  const tags = _.sortBy(data.totalMarkdown.group, ["totalCount"]).reverse()
  const {currentPage, totalPage} = pageContext // 현재 페이지와 총 페이지 수

  if (posts.length === 0) {
    return (
        <p>
          No blog posts found. Add markdown posts
          to &quot;content/blog&quot; (or
          the directory you specified for
          the &quot;gatsby-source-filesystem&quot;
          plugin in gatsby-config.js).
        </p>
    )
  }

  return (
      <Layout>
        <SEO title={title} description={description} url={siteUrl}/>
        <VerticalSpace size={48}/>
        <Bio/>
        <Divider/>
        <SideTagList tags={tags} postCount={data.totalMarkdown.nodes.length}/>
        <PostList postList={posts}/>
        <Divider/>
        <PageIndex currentPage={currentPage} totalPage={totalPage} />
      </Layout>
  )
}
export default PostPagination

export const pageQuery = graphql`
    query BlogPostBySlug($skip: Int!) {
        paging: allMarkdownRemark(
            sort: { fields: [frontmatter___date], order: DESC }
            skip: $skip
            limit: 10
        ){
            group(field: frontmatter___tags) {
                fieldValue
                totalCount
            }
            nodes {
                excerpt(pruneLength: 200, truncate: true)
                fields {
                    slug
                }
                frontmatter {
                    date(formatString: "MMMM DD, YYYY")
                    update(formatString: "MMM DD, YYYY")
                    title
                    description
                    tags
                }
            }
        }
        totalMarkdown: allMarkdownRemark(
            sort: { fields: [frontmatter___date], order: DESC }
        ){
            group(field: frontmatter___tags) {
                fieldValue
                totalCount
            }
            nodes{
                fields {
                    slug
                }
            }
        }
    }
`
