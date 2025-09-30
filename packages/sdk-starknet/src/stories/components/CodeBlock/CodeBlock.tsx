import './CodeBlockStyles.css';

interface ICodeBlockProps {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  text?: any;
  withFormatting?: boolean;
}

export function CodeBlock({
  text,
  withFormatting = true,
}: ICodeBlockProps): JSX.Element | null {
  const formattedCode =
    text && withFormatting ? JSON.stringify(text, null, 2) : text;

  if (text === undefined || text === null) {
    return null;
  }

  const isError = text instanceof Error;

  return (
    <pre
      className="card my-3 code-block--max-height"
      style={
        isError
          ? {
              color: 'white',
              background: 'red',
              borderColor: 'darkred',
            }
          : undefined
      }
    >
      <code className="card-body">{formattedCode}</code>
    </pre>
  );
}
