import sharp from "sharp";

const MAX_ARTICLE_IMAGE_DIMENSION = 1920;
const PLAYER_PHOTO_TARGET_BYTES = 90 * 1024;
const PLAYER_PHOTO_ATTEMPTS = [
  { width: 600, height: 750, quality: 80 },
  { width: 600, height: 750, quality: 70 },
  { width: 520, height: 650, quality: 66 },
  { width: 440, height: 550, quality: 62 },
  { width: 360, height: 450, quality: 55 }
];
const MAX_INPUT_PIXELS = 40_000_000;

function processingError(cause) {
  const error = new Error("No se pudo procesar la imagen. Comprueba que el archivo no este danado.");
  error.status = 400;
  error.cause = cause;
  return error;
}

export async function optimizeArticleImage({ data }) {
  try {
    const source = sharp(data, { failOn: "none", limitInputPixels: MAX_INPUT_PIXELS });
    const metadata = await source.metadata();
    if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format)) {
      throw new Error("Formato de imagen no compatible.");
    }
    if (Number(metadata.pages || 1) > 1) {
      throw new Error("Las imagenes animadas no son compatibles.");
    }

    let pipeline = source
      .rotate()
      .resize({
        width: MAX_ARTICLE_IMAGE_DIMENSION,
        height: MAX_ARTICLE_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
        fastShrinkOnLoad: true
      });

    const preservePng = metadata.format === "png" || metadata.hasAlpha;
    pipeline = preservePng
      ? pipeline.png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
      : pipeline.jpeg({ quality: 86, progressive: true, mozjpeg: true, chromaSubsampling: "4:4:4" });

    const { data: optimizedData, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      data: optimizedData,
      contentType: preservePng ? "image/png" : "image/jpeg",
      width: info.width,
      height: info.height,
      sizeBytes: optimizedData.length,
      sourceSizeBytes: data.length,
      savedPercent: data.length > optimizedData.length
        ? Math.round((1 - optimizedData.length / data.length) * 100)
        : 0
    };
  } catch (error) {
    if (error.status) throw error;
    throw processingError(error);
  }
}

export async function optimizePlayerPhoto({ data }) {
  try {
    const source = sharp(data, { failOn: "none", limitInputPixels: MAX_INPUT_PIXELS });
    const metadata = await source.metadata();
    if (!metadata.width || !metadata.height || !["jpeg", "png", "webp"].includes(metadata.format)) {
      throw new Error("Formato de imagen no compatible.");
    }
    if (Number(metadata.pages || 1) > 1) {
      throw new Error("Las imagenes animadas no son compatibles.");
    }

    let optimized;
    for (const attempt of PLAYER_PHOTO_ATTEMPTS) {
      optimized = await sharp(data, { failOn: "none", limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({
          width: attempt.width,
          height: attempt.height,
          fit: "inside",
          withoutEnlargement: true,
          fastShrinkOnLoad: true
        })
        .webp({ quality: attempt.quality, alphaQuality: 85, effort: 6, smartSubsample: true })
        .toBuffer({ resolveWithObject: true });
      if (optimized.data.length <= PLAYER_PHOTO_TARGET_BYTES) break;
    }

    const { data: optimizedData, info } = optimized;

    return {
      data: optimizedData,
      contentType: "image/webp",
      width: info.width,
      height: info.height,
      sizeBytes: optimizedData.length,
      sourceSizeBytes: data.length
    };
  } catch (error) {
    if (error.status) throw error;
    throw processingError(error);
  }
}
