import * as React from 'react';
import {
  FacebookIcon as FacebookLucideIcon,
  InstagramIcon as InstagramLucideIcon,
  LinkedinIcon,
  Music2Icon,
  TwitterIcon
} from 'lucide-react';

type IconProps = React.SVGProps<SVGSVGElement>;

export function XIcon(props: IconProps): React.JSX.Element {
  return <TwitterIcon {...props} />;
}

export function LinkedInIcon(props: IconProps): React.JSX.Element {
  return <LinkedinIcon {...props} />;
}

export function FacebookIcon(props: IconProps): React.JSX.Element {
  return <FacebookLucideIcon {...props} />;
}

export function InstagramIcon(props: IconProps): React.JSX.Element {
  return <InstagramLucideIcon {...props} />;
}

export function TikTokIcon(props: IconProps): React.JSX.Element {
  return <Music2Icon {...props} />;
}
