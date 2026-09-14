import * as React from 'react';

import { APP_DESCRIPTION, APP_NAME } from '~/lib/common/app';

type OgImageProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
};

export function OgImage({
  eyebrow = 'Runtime control',
  title = APP_NAME,
  description = APP_DESCRIPTION
}: OgImageProps = {}): React.JSX.Element {
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
          'radial-gradient(circle at 85% 15%, rgba(250, 204, 21, 0.28), transparent 28%), linear-gradient(135deg, rgb(8, 8, 10), rgb(24, 24, 27) 58%, rgb(39, 39, 42))',
        color: 'white'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: 25,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgb(250, 204, 21)'
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: 'rgb(250, 204, 21)'
          }}
        />
        {eyebrow}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 78, fontWeight: 750, letterSpacing: '-0.04em' }}>
          {title}
        </div>
        <div
          style={{
            maxWidth: 990,
            fontSize: 32,
            lineHeight: 1.3,
            color: 'rgb(212, 212, 216)'
          }}
        >
          {description}
        </div>
      </div>
      <div style={{ display: 'flex', fontSize: 24, color: 'rgb(161, 161, 170)' }}>
        captar.aurat.ai
      </div>
    </div>
  );
}
