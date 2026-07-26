/**
 * Every audio file the experience uses, resolved through Vite so each one is
 * content-hashed. The hash matters more than it looks: this deploys to GitHub
 * Pages, where a re-uploaded file under an unchanged name can sit in a
 * visitor's cache for a long time — and someone hearing last week's mix in a
 * pitch meeting has no way of knowing that is what happened.
 *
 * Importing the URL does not fetch anything. The files are pulled deliberately,
 * during the intro, by the engine.
 */

import wind from '../assets/audio/wind.mp3?url'
import sea from '../assets/audio/sea.mp3?url'
import forest from '../assets/audio/forest.mp3?url'
import birds from '../assets/audio/birds.mp3?url'
import rain from '../assets/audio/rain.mp3?url'
import hum from '../assets/audio/hum.mp3?url'
import rumble from '../assets/audio/rumble.mp3?url'
import pen from '../assets/audio/pen.mp3?url'
import stone from '../assets/audio/stone.mp3?url'
import dawn from '../assets/audio/dawn.mp3?url'

import music from '../assets/audio/music.mp3?url'

import qWorld from '../assets/audio/voice-world.mp3?url'
import qVoice from '../assets/audio/voice-voice.mp3?url'
import qHour from '../assets/audio/voice-hour.mp3?url'
import qLight from '../assets/audio/voice-light.mp3?url'

export const BED_URLS = { wind, sea, forest, birds, rain, hum, rumble, pen, stone, dawn }

export const MUSIC_URL = music

/**
 * The exact length each loop was cut to, in seconds.
 *
 * This has to be written down rather than read off the decoded buffer,
 * because an MP3 decodes to slightly *more* than it was encoded from: the
 * format carries a few milliseconds of encoder padding, whether a browser
 * strips it is not standardised, and a loop that runs into it ticks once per
 * cycle — quietly on Chrome, audibly on Safari. Knowing the true length lets
 * the engine cut the padding off itself and stop depending on the browser.
 */
export const LOOP_SECONDS = {
  music: 52,
  wind: 14,
  sea: 18,
  forest: 20,
  birds: 24,
  rain: 14,
  hum: 12,
  rumble: 14,
  pen: 14,
  stone: 16,
  dawn: 18,
}

/** Keyed by question id, so the engine can ask for a question by name. */
export const VOICE_URLS = {
  world: qWorld,
  voice: qVoice,
  hour: qHour,
  light: qLight,
}
