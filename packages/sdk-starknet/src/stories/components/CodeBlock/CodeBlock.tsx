import './CodeBlockStyles.css';

interface ICodeBlockProps {
  text?: unknown;
  withFormatting?: boolean;
}

export function CodeBlock({
  text,
  withFormatting = true,
}: ICodeBlockProps): JSX.Element | null {
  if (text === undefined || text === null) {
    return null;
  }

  const formattedCode: string = withFormatting
    ? JSON.stringify(text, null, 2)
    : String(text);

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
