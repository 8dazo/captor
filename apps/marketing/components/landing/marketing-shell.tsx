'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const links = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/docs', label: 'Documentation' },
  { href: 'https://github.com/8dazo/captor', label: 'GitHub' },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="captor-nav"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <a className="captor-skip" href="#main-content">
        Skip to content
      </a>
      <div className="captor-nav-inner">
        <Link className="captor-brand" href="/" aria-label="Captor home">
          <Image src="/logo.png" alt="" width={34} height={34} priority />
          <span>
            captor<span className="captor-brand-dot">.</span>
          </span>
        </Link>
        <nav className="captor-desktop-links" aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <Link className="captor-nav-cta" href="/docs/getting-started/quickstart">
          Start building <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
        <button
          className="captor-menu-toggle"
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls="captor-mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <nav
        id="captor-mobile-nav"
        className="captor-mobile-links"
        aria-label="Mobile navigation"
        hidden={!open}
      >
        {links.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="captor-footer">
      <div className="captor-footer-top">
        <Link href="/" className="captor-brand" aria-label="Captor home">
          <Image src="/logo.png" alt="" width={28} height={28} />
          <span>captor.</span>
        </Link>
        <p>A little control goes a long way.</p>
        <nav aria-label="Footer navigation">
          <Link href="/docs">Docs</Link>
          <Link href="/pricing">Access</Link>
          <Link href="/story">Story</Link>
          <Link href="https://github.com/8dazo/captor">
            GitHub <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </nav>
      </div>
      <div className="captor-footer-bottom">
        <span>© {new Date().getFullYear()} Captor</span>
        <span>Open source. Built for your stack.</span>
        <div>
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms-of-use">Terms</Link>
          <Link href="/cookie-policy">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
