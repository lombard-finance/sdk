type FuncType = 'api-get' | 'api-post' | 'read' | 'write' | 'flow';

// biome-ignore lint/suspicious/noExplicitAny: Story element
export const functionType = (type: FuncType) => (Story: any) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '5px',
        flexDirection: 'column',
        border: `1px solid ${colors[type]}`,
        borderRadius: '5px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'row',
          gap: '5px',
          fontSize: '0.8em',
          background: colors[type],
          color: 'var(--bs-white)',
          padding: '2px 5px',
          //   borderRadius: '5px',
        }}
      >
        <span style={{ fontWeight: '800 ' }}>{labels[type]}</span>
        <span style={{ opacity: '0.8' }}>{descriptions[type]}</span>
      </div>

      <div
        style={{
          padding: '20px',
        }}
      >
        <Story />
      </div>
    </div>
  );
};

const labels: Record<FuncType, string> = {
  'api-get': 'API (get)',
  'api-post': 'API (post)',
  read: 'READ',
  write: 'WRITE',
  flow: 'FLOW',
};

const descriptions: Record<FuncType, string> = {
  'api-get': 'The function gets data from the Lombard API(s)',
  'api-post': 'The function posts data to the Lombard API(s)',
  read: 'The function reads data from the contract(s)',
  write:
    'The function writes data to the contract(s) or performs a wallet action.',
  flow: '',
};

const colors: Record<FuncType, string> = {
  'api-get': 'rgb(100 100 255)',
  'api-post': 'rgb(100 0 255)',
  read: 'rgb(200 100 255)',
  write: 'rgb(200 0 255)',
  flow: 'rgb(0 155 255)',
};
