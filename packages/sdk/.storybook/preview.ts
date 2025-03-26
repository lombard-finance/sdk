import type { Preview } from '@storybook/react';
// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
import { Buffer } from 'buffer';

import 'bootstrap/dist/css/bootstrap.min.css';

window.Buffer = Buffer;

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
