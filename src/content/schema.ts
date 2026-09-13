import { z } from 'zod'
import { LANGUAGES } from '@/lib/languages'

/**
 * Content schema. Every course JSON is validated against this at build time and
 * in tests, so a malformed lesson fails loudly instead of rendering a broken
 * exercise.
 *
 * Two deliberate departures from the app that inspired this one:
 *
 *  1. Options are objects, not two parallel arrays (`options` + `optionsRomanized`)
 *     that a human has to keep index-aligned with nothing checking.
 *  2. `answer` is the index into the authored order, and the runtime shuffles.
 *     The reference app authored the correct answer first in all 75 of its
 *     questions and never shuffled, so the whole quiz was solvable by always
 *     tapping the top-left box. `validate-content` asserts we haven't done that.
 */

const id = z.string().regex(/^[a-z0-9-]+$/, 'ids are lowercase kebab-case')

const Option = z.object({
  text: z.string().min(1),
  romanized: z.string().optional(),
})
export type Option = z.infer<typeof Option>

/** The other person's line in a scene, heard before the learner's turn. */
const Lead = z.object({
  text: z.string().min(1),
  romanized: z.string().min(1),
  english: z.string().min(1),
})
export type Lead = z.infer<typeof Lead>

const base = {
  id,
  /** English meaning. */
  english: z.string().min(1),
  /** The phrase in the target script. This is what gets synthesized. */
  target: z.string().min(1),
  /** Roman pronunciation guide, drafted by scripts/romanize.ts and reviewed. */
  romanized: z.string().min(1),
  /** Short contextual note ("declining an offer"). A real field, rather than the
   *  reference app's 26-branch hardcoded English-substring ladder. */
  hint: z.string().optional(),
  /** Scenes only: what the other person says before this turn. */
  lead: Lead.optional(),
}

/** Hear the phrase, choose its English meaning. */
const ListenChoose = z.object({
  ...base,
  type: z.literal('listen-choose'),
  /** English meanings. */
  options: z.array(z.string().min(1)).min(3).max(6),
  answer: z.number().int().min(0),
})

/** Read the English, choose the phrase in the target script. */
const SelectPhrase = z.object({
  ...base,
  type: z.literal('select-phrase'),
  options: z.array(Option).min(3).max(6),
  answer: z.number().int().min(0),
})

/** Say the phrase; scored against Sarvam STT. */
const SpeakRepeat = z.object({
  ...base,
  type: z.literal('speak-repeat'),
})

/** Rebuild the phrase from tappable word tiles — production practice without
 *  asking anyone to type Devanagari on a phone keyboard. */
const WordOrder = z.object({
  ...base,
  type: z.literal('word-order'),
  /** Extra decoy tiles mixed in with the real words. */
  extraWords: z.array(z.string().min(1)).max(4).optional(),
})

/** Hear the phrase, type its romanization on a Latin keyboard. */
const ListenTypeRoman = z.object({
  ...base,
  type: z.literal('listen-type-roman'),
})

const Pair = z.object({
  target: z.string().min(1),
  english: z.string().min(1),
  romanized: z.string().min(1),
})
export type Pair = z.infer<typeof Pair>

/** Tap to match native script against English. */
const MatchPairs = z.object({
  id,
  type: z.literal('match-pairs'),
  pairs: z.array(Pair).min(3).max(6),
})

export const Exercise = z.discriminatedUnion('type', [
  ListenChoose, SelectPhrase, SpeakRepeat, WordOrder, ListenTypeRoman, MatchPairs,
])
export type Exercise = z.infer<typeof Exercise>
export type ExerciseType = Exercise['type']

export const EXERCISE_TYPES = [
  'listen-choose', 'select-phrase', 'speak-repeat',
  'word-order', 'listen-type-roman', 'match-pairs',
] as const

/**
 * What a scene turn can be: choose your line, say it, build it -- each answering
 * the other person's `lead` -- or catch what they said. In a listen-choose turn
 * the target *is* their line, so it takes no lead; two lines autoplaying
 * back to back would talk over each other. The turn after a listen turn may
 * skip its lead: it answers the line just heard.
 */
export const SCENE_TURN_TYPES = ['select-phrase', 'speak-repeat', 'word-order', 'listen-choose'] as const
export const MAX_SCENE_TURNS = 8

export const Lesson = z.object({
  id,
  title: z.string().min(1),
  /** Present on a scene: a short exchange that closes its unit. */
  scene: z.object({
    /** Sets the stage in a line: "A busy chai stall." */
    setting: z.string().min(1),
    /** Who you're talking to: "Chai-wala". */
    other: z.string().min(1),
  }).optional(),
  exercises: z.array(Exercise).min(3),
}).superRefine((lesson, ctx) => {
  const issue = (message: string, path: PropertyKey[] = []) => ctx.addIssue({ code: 'custom', message, path })

  if (lesson.scene && lesson.exercises.length > MAX_SCENE_TURNS) {
    issue(`a scene has at most ${MAX_SCENE_TURNS} turns`, ['exercises'])
  }
  lesson.exercises.forEach((ex, i) => {
    const at = ['exercises', i]
    const lead = ex.type === 'match-pairs' ? undefined : ex.lead
    if (!lesson.scene) {
      if (lead) issue('lead belongs only in a scene', [...at, 'lead'])
      return
    }
    const answersListen = lesson.exercises[i - 1]?.type === 'listen-choose'
    if (!(SCENE_TURN_TYPES as readonly string[]).includes(ex.type)) issue(`${ex.type} can't be a scene turn`, at)
    else if (ex.type === 'listen-choose' && lead) issue("a listen-choose turn is their line; it takes no lead", [...at, 'lead'])
    else if (ex.type !== 'listen-choose' && !lead && !answersListen) issue('a scene turn answers a lead, or the listen turn before it', at)
  })
})
export type Lesson = z.infer<typeof Lesson>
export type SceneLesson = Lesson & { scene: NonNullable<Lesson['scene']> }

/** Presence of `scene` is the discriminant; there's no separate `kind`. */
export function isScene(lesson: Pick<Lesson, 'scene'>): lesson is SceneLesson {
  return lesson.scene !== undefined
}

export const Unit = z.object({
  id,
  title: z.string().min(1),
  emoji: z.string().min(1),
  lessons: z.array(Lesson).min(1),
}).superRefine((unit, ctx) => {
  // A scene is the unit's capstone: it uses the unit's phrases, so it comes last.
  const scenes = unit.lessons.flatMap((l, i) => (l.scene ? [i] : []))
  if (scenes.length > 1) ctx.addIssue({ code: 'custom', message: 'one scene per unit', path: ['lessons'] })
  else if (scenes.length === 1 && scenes[0] !== unit.lessons.length - 1) {
    ctx.addIssue({ code: 'custom', message: 'a scene closes its unit', path: ['lessons', scenes[0]] })
  }
})
export type Unit = z.infer<typeof Unit>

export const Course = z.object({
  lang: z.enum(LANGUAGES),
  /** One-line pitch shown on the home screen. */
  tagline: z.string().min(1),
  units: z.array(Unit).min(1),
})
export type Course = z.infer<typeof Course>

/** An exercise carrying a single phrase — i.e. everything except match-pairs. */
export type PhraseExercise = Exclude<Exercise, { type: 'match-pairs' }>

export function hasOptions(e: Exercise): e is z.infer<typeof ListenChoose> | z.infer<typeof SelectPhrase> {
  return e.type === 'listen-choose' || e.type === 'select-phrase'
}
