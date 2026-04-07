import createMDX from "@next/mdx";

const withMDX = createMDX({});

export default withMDX({
  pageExtensions: ["ts", "tsx", "mdx"],
});
