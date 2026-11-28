const LOUD = 0.02; // volume (0 to 1) above which the tutor counts as speaking
const HOLD_MS = 700; // silence this long means the tutor stopped

// Watch the tutor's voice and report when speaking starts or stops
export function startSpeakingDetector(
  ctx: AudioContext,
  stream: MediaStream,
  onChange: (speaking: boolean) => void,
) {
  // Take the tutor's voice into the audio context
  const source = ctx.createMediaStreamSource(stream);
  // Volume meter: lets us read the current waveform
  const analyser = ctx.createAnalyser();
  // Feed the voice into the meter, not to the speaker (the <audio> tag plays it)
  source.connect(analyser);

  const samples = new Uint8Array(analyser.fftSize);
  let speaking = false;
  let lastLoudAt = 0;

  const timer = setInterval(() => {
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const s of samples) {
      const v = (s - 128) / 128;
      sum += v * v;
    }
    const volume = Math.sqrt(sum / samples.length);
    const now = performance.now();

    if (volume > LOUD) {
      lastLoudAt = now;
      if (!speaking) {
        speaking = true;
        onChange(true);
      }
    } else if (speaking && now - lastLoudAt > HOLD_MS) {
      speaking = false;
      onChange(false);
    }
  }, 50);

  return () => {
    clearInterval(timer);
    source.disconnect();
  };
}
