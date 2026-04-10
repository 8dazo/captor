import * as React from 'react';

import { APP_DESCRIPTION, APP_NAME } from '~/lib/common/app';

export function OgImage(): React.JSX.Element {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px',
        background:
          'linear-gradient(135deg, rgb(15, 23, 42), rgb(37, 99, 235) 55%, rgb(125, 211, 252))',
        color: 'white'
      }}
    >
      <div
        style={{
          fontSize: 28,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          opacity: 0.8
        }}
      >
        Runtime control
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 82, fontWeight: 700 }}>{APP_NAME}</div>
        <div style={{ maxWidth: 940, fontSize: 34, lineHeight: 1.3 }}>
          {APP_DESCRIPTION}
        </div>
      </div>
    </div>
  );
}
