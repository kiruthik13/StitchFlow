import {
  computeOtsuThreshold,
  decodeCode11Runs,
  decodeFlattermarkenPositions,
  decodeFlattermarkenTemplateFromGrayscale,
  decodeIndustrial2Of5Runs,
  decodeMsiRuns,
  decodePharmacode1TrackRuns,
  decodePharmacode2TrackFromGrayscale,
  decodePharmacode2TrackTracks,
  decodeSpecializedFromGrayscale,
  extractRunLengths,
  RunLength,
  verifyCode11Checksum,
  verifyMsiMod10,
} from '../../src/services/barcode/specialized1dDecoder';

/**
 * Helper: render synthetic 1D bar/space grayscale scanline image (white=250, black=15)
 * with quiet zones so we test actual pixel thresholding + run-length decoding!
 */
function renderScanlineImage(modules: string, modulePx = 4, height = 20): { gray: Uint8Array; width: number; height: number } {
  const quiet = '0'.repeat(10);
  const full = quiet + modules + quiet;
  const width = full.length * modulePx;
  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let i = 0; i < full.length; i++) {
      const val = full[i] === '1' ? 15 : 250;
      for (let x = 0; x < modulePx; x++) {
        gray[y * width + i * modulePx + x] = val;
      }
    }
  }
  return { gray, width, height };
}

function runsFromBitStrings(barSpaceModules: string[]): RunLength[] {
  return barSpaceModules.map((m, idx) => ({
    isBar: idx % 2 === 0,
    length: m === '1' ? 12 : 4,
  }));
}

describe('Specialized 1D Barcode Image & Scanline Decoders', () => {
  it('computes Otsu threshold accurately on bimodal barcode scanlines', () => {
    const { gray } = renderScanlineImage('101100101', 4, 1);
    const t = computeOtsuThreshold(gray);
    expect(t).toBeGreaterThan(20);
    expect(t).toBeLessThan(240);
  });

  it('decodes Code-11 from grayscale image with valid Mod-11 C checksum (forward & reverse)', () => {
    // Code-11 payload: "12" -> C = (1*2 + 2*1) % 11 = 4 -> inner "124"
    expect(verifyCode11Checksum('124')).toEqual({ valid: true, data: '12' });
    // Modules: Start(*)='00110', '1'='10001', '2'='01001', '4'='00101', Stop(*)='00110'
    // Each char has 5 elements (B S B S B) separated by narrow space ('0')
    const seq = ['0','0','1','1','0', '0', '1','0','0','0','1', '0', '0','1','0','0','1', '0', '0','0','1','0','1', '0', '0','0','1','1','0'];
    const runs = runsFromBitStrings(seq);
    const res = decodeCode11Runs(runs);
    expect(res).toMatchObject({ decoded: true, symbology: 'CODE_11', value: '12', checksumValid: true });

    // Reversed scanline orientation
    const revRes = decodeCode11Runs([...runs].reverse());
    expect(revRes).toMatchObject({ decoded: true, symbology: 'CODE_11', value: '12', orientation: 'reverse' });
  });

  it('decodes MSI / MSI Plessey and verifies Mod-10 check digit', () => {
    // Data "12" -> Mod-10: odd=2 -> 2*2=4, even=1 -> sum=5 -> check=5 -> "125"
    expect(verifyMsiMod10('125')).toEqual({ valid: true, data: '12' });
    // Start (B=wide, S=narrow), '1'(0001), '2'(0010), '5'(0101), Stop (narrow B, narrow S, narrow B)
    const digit = (bits: string[]) => bits.flatMap((b) => (b === '1' ? ['1', '0'] : ['0', '1']));
    const seq = [
      '1', '0', // Start
      ...digit(['0', '0', '0', '1']), // 1
      ...digit(['0', '0', '1', '0']), // 2
      ...digit(['0', '1', '0', '1']), // 5
      '0', '1', '0', // Stop (narrow B, wide S, narrow B)
    ];
    const res = decodeMsiRuns(runsFromBitStrings(seq));
    expect(res).toMatchObject({ decoded: true, symbology: 'MSI', value: '12', checksumValid: true });
  });

  it('decodes Pharmacode One-Track and Two-Track test vectors', () => {
    // 1-Track: [wide, narrow, wide] = 2*4 + 1*2 + 2*1 = 12
    const runs1T: RunLength[] = [
      { isBar: true, length: 12 },
      { isBar: false, length: 6 },
      { isBar: true, length: 4 },
      { isBar: false, length: 6 },
      { isBar: true, length: 12 },
    ];
    expect(decodePharmacode1TrackRuns(runs1T)).toMatchObject({
      decoded: true,
      symbology: 'PHARMACODE_1T',
      value: '12',
    });

    // 2-Track: [full(3), bottom(1), top(2)] = 3*9 + 1*3 + 2*1 = 32
    expect(decodePharmacode2TrackTracks([true, false, true], [true, true, false])).toMatchObject({
      decoded: true,
      symbology: 'PHARMACODE_2T',
      value: '32',
    });
  });

  it('decodes Industrial 2 of 5 (distinct from Interleaved 2 of 5)', () => {
    // Start '110' + '1'('10001') + '2'('01001') + Stop '101'
    const barBits = ['1','1','0', '1','0','0','0','1', '0','1','0','0','1', '1','0','1'];
    const runs: RunLength[] = [];
    barBits.forEach((b, idx) => {
      runs.push({ isBar: true, length: b === '1' ? 12 : 4 });
      if (idx < barBits.length - 1) runs.push({ isBar: false, length: 4 });
    });
    expect(decodeIndustrial2Of5Runs(runs)).toMatchObject({
      decoded: true,
      symbology: 'INDUSTRIAL_2_OF_5',
      value: '12',
    });
  });

  it('decodes Flattermarken 4-position bar marks', () => {
    // '1' (1000), '0' (0011), '5' (1100) -> "105"
    const res = decodeFlattermarkenPositions([
      true, false, false, false,
      false, false, true, true,
      true, true, false, false,
    ]);
    expect(res).toMatchObject({ decoded: true, symbology: 'FLATTERMARKEN', value: '105' });
  });

  it('rejects blurry/blank grayscale images cleanly without fabricating results', () => {
    const blank = new Uint8Array(200 * 20).fill(240);
    const res = decodeSpecializedFromGrayscale(blank, 200, 20);
    expect(res.decoded).toBe(false);
    expect(res.value).toBeUndefined();

    // Real rendered Pharmacode 1-Track image: 2 bars wide(3px)+gap(2px)+narrow(1px) -> 2*2 + 1*1 = 5
    const { gray, width, height } = renderScanlineImage('111001', 3, 20);
    const imgRuns = extractRunLengths(gray.subarray(10 * width, 11 * width));
    expect(decodePharmacode1TrackRuns(imgRuns)).toMatchObject({ decoded: true, value: '5' });
  });

  it('decodes controlled-template Flattermarken with leading/internal zeros and rejects noisy fabric textures', () => {
    // Controlled 3-digit Flattermarken template: '1' (1000), '0' (0011), '5' (1100) at 4px pitch
    const templateModules = '100000111100';
    const { gray, width, height } = renderScanlineImage(templateModules, 4, 20);
    const res = decodeFlattermarkenTemplateFromGrayscale(gray, width, height, {
      expectedDigits: 3,
      pitchPx: 4,
    });
    expect(res).toMatchObject({ decoded: true, symbology: 'FLATTERMARKEN', value: '105' });

    // Reject uncalibrated/noisy garment texture without fabricating a result
    const fabricNoise = new Uint8Array(240 * 40);
    for (let i = 0; i < fabricNoise.length; i++) {
      fabricNoise[i] = 115 + ((i * 37) % 25); // low-contrast weave texture
    }
    expect(decodeSpecializedFromGrayscale(fabricNoise, 240, 40).decoded).toBe(false);
    expect(decodePharmacode2TrackFromGrayscale(fabricNoise, 240, 40)).toBeNull();
  });
});
