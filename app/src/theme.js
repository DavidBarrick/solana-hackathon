import { extendTheme } from "@chakra-ui/react";

// 2. Add your color mode config
const config = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({
  fonts: {
    body: "Prompt",
    heading: "Prompt",
    mono: "Prompt",
  },
  config,
});

export default theme;
