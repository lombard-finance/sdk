type FuncType = "read" | "write";

// biome-ignore lint/suspicious/noExplicitAny: Story element
export const functionType = (type: FuncType) => (Story: any) => {
  return (
    <div
      style={{
        display: "flex",
        gap: "5px",
        flexDirection: "column",
        border: `1px solid ${colors[type]}`,
        borderRadius: "5px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          flexDirection: "row",
          gap: "5px",
          fontSize: "0.8em",
          background: colors[type],
          color: "var(--bs-white)",
          padding: "2px 5px",
          //   borderRadius: '5px',
        }}
      >
        <span style={{ fontWeight: "800 " }}>{labels[type]}</span>
        <span style={{ opacity: "0.8" }}>{descriptions[type]}</span>
      </div>

      <div
        style={{
          padding: "20px",
        }}
      >
        <Story />
      </div>
    </div>
  );
};

const labels: Record<FuncType, string> = {
  read: "READ",
  write: "WRITE",
};

const descriptions: Record<FuncType, string> = {
  read: "The function reads data from the contract(s)",
  write:
    "The function writes data to the contract(s) or performs a wallet action.",
};

const colors: Record<FuncType, string> = {
  read: "rgb(200 100 255)",
  write: "rgb(200 0 255)",
};
