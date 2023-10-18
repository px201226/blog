import React from "react"
import {Link} from "gatsby"
import styled from "styled-components";

// 스타일드 컴포넌트를 사용하여 스타일 정의
const PageIndexContainer = styled.div`
  text-align: center;
  margin-bottom: 48px;
  color: ${props => props.theme.colors.text};;
  //margin-top: 30px;
  & > a {
    text-decoration: none;
    color: inherit;
  }
`;

const PageLink = styled(Link)`
  text-decoration: none;
  margin: 0 1px;
  padding: 5px 10px;
  transition: background-color 0.3s, color 0.3s;
  color: ${props => props.theme.colors.text};;

  &:hover {
    text-decoration: none;
    border-bottom: 2px solid ${props => props.theme.colors.hrefLink};;
    color: ${props => props.theme.colors.text};;
  }
`;

const CurrentPageLink = styled(PageLink)`
  border-bottom: 2px solid ${props => props.theme.colors.hrefLink};;
  color: ${props => props.theme.colors.text};;
`;

const PageIndex = ({currentPage, totalPage}) => {
  const indexSize = 5
  const pageNumbers = Array.from({length: totalPage}, (_, i) => i + 1)
  const startPage = Math.min(Math.max(1, currentPage - 2),
      totalPage - indexSize >=1 ? totalPage - indexSize : 1)
  const endPage = Math.min(startPage + indexSize - 1, totalPage)

  return (
      <PageIndexContainer>
        {currentPage > 3 && totalPage > indexSize && (
            <PageLink to={currentPage === 2 ? "/" : `/page/${currentPage - 1}`}>
              &lt;
            </PageLink>
        )}
        {pageNumbers.slice(startPage - 1, endPage).map((number) => (
            <Link
                key={number}
                to={number === 1 ? "/" : `/page/${number}`}
                className={number === currentPage ? "current-page" : ""}
            >
              {number === currentPage ? (
                  <CurrentPageLink
                      to={`/page/${number}`}>{number}</CurrentPageLink>
              ) : (
                  <PageLink to={`/page/${number}`}>{number}</PageLink>
              )}
            </Link>
        ))}
        {currentPage < totalPage - 3 && totalPage > indexSize && (
            <PageLink to={`/page/${currentPage + 1}`}>&gt;</PageLink>
        )}
      </PageIndexContainer>
  )
}

export default PageIndex
