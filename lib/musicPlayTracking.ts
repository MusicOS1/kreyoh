/** Public music-play rules shared by the player and the server.
 *  A stream needs audible, non-seeked progress. Every new meaningful replay
 *  can qualify; seek jumps and rapid duplicate requests cannot manufacture listens.
 */
export function musicListenThreshold(durationSeconds:number):number{
 if(!Number.isFinite(durationSeconds)||durationSeconds<5)return Number.POSITIVE_INFINITY;
 return durationSeconds>60?30:Math.max(5,Math.ceil(durationSeconds*.5));
}
export function audibleProgressDelta(
 positionChangeSeconds:number,
 elapsedWallSeconds:number,
 playbackRate:number
):number{
 if(!Number.isFinite(positionChangeSeconds)||!Number.isFinite(elapsedWallSeconds)||
    !Number.isFinite(playbackRate)||positionChangeSeconds<=0||elapsedWallSeconds<=0)return 0;
 // Chromium/mobile browsers throttle timeupdate while background playback continues.
 // A wall-clock-bound progression remains valid; an instantaneous seek does not.
 const plausible=Math.max(0,elapsedWallSeconds*Math.max(.75,Math.min(2.5,playbackRate))+.75);
 return positionChangeSeconds<=plausible+1.5?Math.min(positionChangeSeconds,plausible):0;
}
export const musicReplayBucket=(timestampMs:number):number=>Math.floor(timestampMs/1000);
