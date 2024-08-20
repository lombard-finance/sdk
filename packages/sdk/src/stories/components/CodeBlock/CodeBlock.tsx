import './CodeBlockStyles.css';

interface ICodeBlockProps {
  text?: any;
  withFormatting?: boolean;
}

export function CodeBlock({
  text,
  withFormatting = true,
}: ICodeBlockProps): JSX.Element | null {
  const formattedCode =
    text && withFormatting ? JSON.stringify(text, null, 2) : text;

  if (!text) {
    return null;
  }

  return (
    <pre className="card my-3 code-block--max-height">
      <code className="card-body">{formattedCode}</code>
    </pre>
  );
}
