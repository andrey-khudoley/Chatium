// @shared

import { s } from '@app/schema'
import { EpisodeDtoSchema } from './episodes'

export type EpisodeDto = s.infer<typeof EpisodeDtoSchema>
