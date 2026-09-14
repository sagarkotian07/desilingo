/**
 * Turns the three mascot drawings in this folder into src/components/ui/Mor.tsx.
 *
 *   npm run gen:mor
 *
 * The SVGs are the source of truth; edit them, not the component.
 */
import fs from 'node:fs'
import path from 'node:path'

const dir = path.dirname(new URL(import.meta.url).pathname)
const out = path.resolve(dir, '../../src/components/ui/Mor.tsx')

function inner(file: string): string {
  let s = fs.readFileSync(path.join(dir, file), 'utf8')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<title[\s\S]*?<\/title>\s*/g, '').replace(/<desc[\s\S]*?<\/desc>\s*/g, '')
  s = s.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  // Attribute names React wants camelCased.
  s = s.replace(/\s(stroke-width|stroke-linecap|stroke-linejoin|stroke-miterlimit|fill-rule|clip-path|fill-opacity|stroke-opacity)=/g,
    (_, a: string) => ' ' + a.replace(/-([a-z])/g, (__, c: string) => c.toUpperCase()) + '=')
  s = s.replace(/\sclass=/g, ' className=')
  // Unique symbol ids, so two Mors on one page do not share a #feather.
  s = s.replace(/id="feather"/g, 'id={`${id}-feather`}').replace(/href="#feather"/g, 'href={`#${id}-feather`}')
  return s.trim().split('\n').map((l) => '      ' + l.trim()).join('\n')
}

const tsx = `import { useId } from 'react'

/**
 * Mor, Desilingo's peacock. Three poses, all one SVG each: \`wave\` for the
 * home hero and course dashboards, \`cheer\` for a finished lesson, and
 * \`mark\`, the head alone, for the header and favicon.
 *
 * Generated from the drawings in scripts/mor by \`npm run gen:mor\`; edit those, not this.
 */

export type MorPose = 'wave' | 'cheer' | 'mark'

const VIEWBOX: Record<MorPose, string> = { wave: '0 0 512 512', cheer: '0 0 512 512', mark: '0 0 64 64' }

export function Mor({ pose = 'wave', className, title }: { pose?: MorPose; className?: string; title?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <svg
      viewBox={VIEWBOX[pose]}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {pose === 'wave' && <Wave id={id} />}
      {pose === 'cheer' && <Cheer id={id} />}
      {pose === 'mark' && <Mark />}
    </svg>
  )
}

function Wave({ id }: { id: string }) {
  return (
    <>
${inner('mor-wave.svg')}
    </>
  )
}

function Cheer({ id }: { id: string }) {
  return (
    <>
${inner('mor-cheer.svg')}
    </>
  )
}

function Mark() {
  return (
    <>
${inner('mor-mark.svg')}
    </>
  )
}
`
fs.writeFileSync(out, tsx)
console.log(`wrote ${path.relative(process.cwd(), out)} (${tsx.length} bytes)`)
