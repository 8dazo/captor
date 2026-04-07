type MDXComponents = Record<string, (props: any) => any>;

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => <h1 style={{ fontSize: "2.4rem", marginBottom: "1rem" }} {...props} />,
    h2: (props) => <h2 style={{ fontSize: "1.5rem", marginTop: "2rem" }} {...props} />,
    pre: (props) => (
      <pre
        style={{
          padding: "1rem",
          borderRadius: "12px",
          background: "#111827",
          color: "#f9fafb",
          overflowX: "auto",
        }}
        {...props}
      />
    ),
    ...components,
  };
}
