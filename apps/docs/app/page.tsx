import Quickstart from "../content/quickstart.mdx";

const cardStyle = {
  border: "1px solid rgba(23,32,51,0.12)",
  borderRadius: "20px",
  padding: "1.5rem",
  background: "rgba(255,255,255,0.72)",
  boxShadow: "0 24px 48px rgba(23,32,51,0.08)",
};

export default function DocsHomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "4rem 1.5rem",
        background:
          "radial-gradient(circle at top left, rgba(214,168,97,0.24), transparent 30%), linear-gradient(180deg, #f4f1e8 0%, #eef2f7 100%)",
      }}
    >
      <section
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          display: "grid",
          gap: "1.5rem",
        }}
      >
        <div style={cardStyle}>
          <p
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontSize: "0.78rem",
              marginBottom: "0.6rem",
            }}
          >
            Captar Docs
          </p>
          <h1 style={{ fontSize: "3rem", margin: 0 }}>
            Stop runaway AI calls before they spend, act, or leak.
          </h1>
          <p style={{ maxWidth: "42rem", fontSize: "1.1rem", lineHeight: 1.7 }}>
            Captar adds local hard budget enforcement, tool guardrails, and
            execution policies to OpenAI-based apps without forcing a gateway or
            replacing provider SDKs, then turns strong traces into reusable
            project datasets for the next eval step.
          </p>
        </div>
        <article style={cardStyle}>
          <Quickstart />
        </article>
      </section>
    </main>
  );
}
