export const INITIAL_WORDS = [
  'りんご',
  'ごりら',
  'らくだ',
  'だんご',
  'ごま',
  'まめ',
  'めだか',
  'かめ',
  'めろん',
  'ろんり',
];

export const GAME_SETTINGS = {
  TIME_LIMIT: 30, // 秒
  MIN_WORD_LENGTH: 2,
  MAX_WORD_LENGTH: 10,
  POINTS_PER_WORD: 10,
  BONUS_POINTS: 5,
};

export const GAME_STATES = {
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver',
} as const; 