import 'bootstrap/dist/css/bootstrap.min.css';

import { Buffer } from 'node:buffer';

import type { Preview } from '@storybook/react';

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
