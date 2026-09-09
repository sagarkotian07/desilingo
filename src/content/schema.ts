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

export const Lesson = z.object({
  id,
  title: z.string().min(1),
  exercises: z.array(Exercise).min(3),
})
export type Lesson = z.infer<typeof Lesson>

export const Unit = z.object({
  id,
  title: z.string().min(1),
  emoji: z.string().min(1),
  lessons: z.array(Lesson).min(1),
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
