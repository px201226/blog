import { createGlobalStyle } from "styled-components"
import reset from "styled-reset"

const GlobalStyles = createGlobalStyle`
  ${reset}

  body {
    font-family: 'Open sans', -apple-system;
    background: ${props => props.theme.colors.bodyBackground};
  }

`

export default GlobalStyles
