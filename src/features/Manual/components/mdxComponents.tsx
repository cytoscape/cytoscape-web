import type { MDXComponents } from 'mdx/types'
import {
  type AnchorHTMLAttributes,
  Children,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'

import { MANUAL_ROUTE_SEGMENT } from '@/data/db/dbScope'

import {
  classifyManualLink,
  resolveManualAsset,
  slugifyHeading,
} from '../manualSlug'
import { LiveDemo } from './LiveDemo'
import { Note } from './Note'
import { VisualPropertyTable } from './VisualPropertyTable'

/** Plain text of a heading's children, for its id. */
const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        return String(child)
      }
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return textOf(child.props.children)
      }
      return ''
    })
    .join('')

const heading =
  (Tag: 'h1' | 'h2' | 'h3' | 'h4') =>
  ({ id, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) => (
    <Tag id={id ?? slugifyHeading(textOf(children))} {...rest}>
      {children}
    </Tag>
  )

const ManualImage = ({
  src,
  alt,
  ...rest
}: ImgHTMLAttributes<HTMLImageElement>): ReactElement => (
  <img
    src={
      src === undefined
        ? undefined
        : resolveManualAsset(src, import.meta.env.BASE_URL)
    }
    alt={alt ?? ''}
    loading="lazy"
    {...rest}
  />
)

const ManualLink = ({
  href,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>): ReactElement => {
  if (href === undefined) {
    return <a {...rest}>{children}</a>
  }
  switch (classifyManualLink(href)) {
    case 'external':
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
          {children}
        </a>
      )
    case 'app':
      // A full page load: the manual's sandbox database must not follow the
      // reader into the editor (see src/data/db/dbScope.ts).
      return (
        <a
          href={resolveManualAsset(href.slice(1), import.meta.env.BASE_URL)}
          {...rest}
        >
          {children}
        </a>
      )
    case 'page':
      // Absolute, not relative: under the `/manual/*` splat route React
      // Router 6 resolves `..` against `/manual`, not the current page, so a
      // relative link left the manual for `/<slug>` — a workspace id.
      return (
        <Link
          to={href.startsWith('#') ? href : `/${MANUAL_ROUTE_SEGMENT}/${href}`}
        >
          {children}
        </Link>
      )
  }
}

/**
 * How the manual renders MDX. Content files hold text only; this map owns
 * every presentation decision. Components named here (`LiveDemo`, `Note`,
 * `VisualPropertyTable`)
 * are usable in any page without an import.
 */
export const mdxComponents: MDXComponents = {
  h1: heading('h1'),
  h2: heading('h2'),
  h3: heading('h3'),
  h4: heading('h4'),
  img: ManualImage,
  a: ManualLink,
  LiveDemo,
  Note,
  VisualPropertyTable,
}
