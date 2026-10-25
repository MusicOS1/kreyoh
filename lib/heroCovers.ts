import 'server-only';

/** Owner-supplied editorial artwork, independent of release status or voting. */
export async function publicHeroCovers(): Promise<string[]> {
  return [
    '/artwork/homepage/BehindTheSins.webp',
    '/artwork/homepage/RiseOfTheMicKing.webp',
    '/artwork/homepage/CapitalBehaviour.webp',
    '/artwork/homepage/MadMeetsCrazyNight.webp',
    '/artwork/homepage/JaoWinner.webp',
    '/artwork/homepage/MadMeetsCrazyStreet.webp',
    '/artwork/homepage/Gerito.webp',
    '/artwork/homepage/KeepStreaming.webp',
    '/artwork/homepage/FridayFightNight.webp',
    '/artwork/homepage/MadMeetsCrazy.webp',
    '/artwork/homepage/TheComeback.webp',
    '/artwork/homepage/LiamWinner.webp',
  ];
}
