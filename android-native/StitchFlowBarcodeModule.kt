package com.stitchflow.app

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import zxingcpp.BarcodeReader
import zxingcpp.BarcodeReader.Format
import java.io.File
import kotlin.math.max
import kotlin.math.min

class StitchFlowBarcodeModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "StitchFlowBarcode"

  private val reader: BarcodeReader by lazy {
    BarcodeReader().apply {
      options.formats = setOf(
        Format.MICRO_QR_CODE,
        Format.DATA_BAR,
        Format.DATA_BAR_EXPANDED,
        Format.QR_CODE,
        Format.DATA_MATRIX,
        Format.AZTEC,
        Format.PDF_417,
        Format.CODE_128,
        Format.CODE_39,
        Format.CODE_93,
        Format.ITF,
        Format.EAN_13,
        Format.EAN_8,
        Format.UPC_A,
        Format.UPC_E,
        Format.CODABAR
      )
      options.tryHarder = true
      options.tryRotate = true
      options.tryInvert = true
    }
  }

  private fun rotateIfNeeded(bitmap: Bitmap, filePath: String): Bitmap {
    val exif = ExifInterface(filePath)
    val orientation = exif.getAttributeInt(
      ExifInterface.TAG_ORIENTATION,
      ExifInterface.ORIENTATION_NORMAL
    )
    val degrees = when (orientation) {
      ExifInterface.ORIENTATION_ROTATE_90 -> 90f
      ExifInterface.ORIENTATION_ROTATE_180 -> 180f
      ExifInterface.ORIENTATION_ROTATE_270 -> 270f
      else -> 0f
    }
    if (degrees == 0f) return bitmap
    val matrix = Matrix().apply { postRotate(degrees) }
    val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    if (rotated !== bitmap) bitmap.recycle()
    return rotated
  }

  private fun computeInSampleSize(width: Int, height: Int, maxDim: Int): Int {
    var sample = 1
    var w = width
    var h = height
    while (w / 2 >= maxDim || h / 2 >= maxDim) {
      w /= 2
      h /= 2
      sample *= 2
    }
    return sample
  }

  @ReactMethod
  fun decodeOrExtractRoi(uriString: String, includeRoi: Boolean, promise: Promise) {
    var bitmap: Bitmap? = null
    var fileToCleanup: File? = null
    try {
      val uri = Uri.parse(uriString)
      val path = uri.path ?: throw IllegalArgumentException("Invalid image URI")
      val file = File(path)
      if (path.contains(reactContext.cacheDir.absolutePath)) {
        fileToCleanup = file
      }
      if (!file.exists()) {
        promise.resolve(Arguments.createMap().apply {
          putBoolean("decoded", false)
          putString("reason", "Image file not found")
        })
        return
      }

      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.absolutePath, bounds)

      val opts = BitmapFactory.Options().apply {
        inPreferredConfig = Bitmap.Config.ARGB_8888
        inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, 960)
      }
      val rawBitmap = BitmapFactory.decodeFile(file.absolutePath, opts)
      if (rawBitmap == null) {
        promise.resolve(Arguments.createMap().apply {
          putBoolean("decoded", false)
          putString("reason", "Failed to decode bitmap")
        })
        return
      }
      bitmap = rotateIfNeeded(rawBitmap, file.absolutePath)

      val results = reader.read(bitmap)
      val first = results.firstOrNull()
      val map = Arguments.createMap()
      if (first != null && !first.text.isNullOrEmpty()) {
        map.putBoolean("decoded", true)
        map.putString("text", first.text)
        map.putString("format", first.format.name)
        map.putString("decoder", "zxing-cpp")
        promise.resolve(map)
        return
      }

      map.putBoolean("decoded", false)
      map.putString("decoder", "zxing-cpp")

      if (includeRoi) {
        val bw = bitmap.width
        val bh = bitmap.height
        val roiX = (bw * 0.125).toInt()
        val roiY = (bh * 0.325).toInt()
        val roiW = min(480, max(1, (bw * 0.75).toInt()))
        val roiH = min(120, max(1, (bh * 0.35).toInt()))
        val clampedW = min(roiW, bw - roiX)
        val clampedH = min(roiH, bh - roiY)
        if (clampedW > 8 && clampedH > 8) {
          val pixels = IntArray(clampedW * clampedH)
          bitmap.getPixels(pixels, 0, clampedW, roiX, roiY, clampedW, clampedH)
          val gray = ByteArray(clampedW * clampedH)
          for (i in pixels.indices) {
            val px = pixels[i]
            val r = (px shr 16) and 0xFF
            val g = (px shr 8) and 0xFF
            val b = px and 0xFF
            gray[i] = ((299 * r + 587 * g + 114 * b) / 1000).toByte()
          }
          map.putString("roiGrayscaleBase64", Base64.encodeToString(gray, Base64.NO_WRAP))
          map.putInt("roiWidth", clampedW)
          map.putInt("roiHeight", clampedH)
        }
      }

      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("E_BARCODE_DECODE", e.message, e)
    } finally {
      bitmap?.recycle()
      fileToCleanup?.let {
        try {
          if (it.exists()) it.delete()
        } catch (_: Exception) {}
      }
    }
  }

  @ReactMethod
  fun decodeImageFile(uriString: String, promise: Promise) {
    decodeOrExtractRoi(uriString, false, promise)
  }
}
