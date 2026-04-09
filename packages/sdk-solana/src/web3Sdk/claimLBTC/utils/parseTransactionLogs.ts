export const parseTransactionLogs = (
  err: unknown,
): { errorMessage: string; errorLogs: string[] } => {
  console.error("Error claiming LBTC:", err);
  let errorMessage =
    typeof err === "object" && err !== null && "message" in err
      ? (err.message as string)
      : String(err);
  let errorLogs: string[] = [];

  if (typeof errorMessage === "string") {
    const logParts = errorMessage.split("Logs:");
    if (logParts.length > 1) {
      errorMessage = logParts[0].trim();
      try {
        let logsText = logParts[1].trim();

        if (logsText.startsWith("[") && logsText.endsWith("]")) {
          try {
            errorLogs = JSON.parse(logsText);

            return { errorMessage, errorLogs };
          } catch {
            logsText = logsText.replace(/^\[|\]$/g, "");
            errorLogs = logsText
              .split(/",?\s*"/)
              .map((line) => line.replace(/^"|"$/g, "")); // Remove quotes

            return { errorMessage, errorLogs };
          }
        } else {
          errorLogs = logsText.split("\n").filter((line) => line.trim() !== "");
          return { errorMessage, errorLogs };
        }
      } catch (parseError) {
        console.error("Failed to parse logs:", parseError);
        errorMessage = err instanceof Error ? err.message : String(err);
        return { errorMessage, errorLogs: [] };
      }
    }
  }

  return { errorMessage, errorLogs };
};
