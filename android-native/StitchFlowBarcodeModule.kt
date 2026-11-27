package com.stitchflow.app

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import zxingcpp.BarcodeReader
import zxingcpp.BarcodeReader.Format
import java.io.File

class StitchFlowBarcodeModule(reactContext: ReactApplicationContext) :
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

  @ReactMethod
  fun decodeImageFile(uriString: String, promise: Promise) {
    var bitmap: Bitmap? = null
    try {
      val uri = Uri.parse(uriString)
      val path = uri.path ?: throw IllegalArgumentException("Invalid image URI")
      val file = File(path)
      if (!file.exists()) {
        promise.resolve(Arguments.createMap().apply {
          putBoolean("decoded", false)
          putString("reason", "Image file not found")
        })
        return
      }

      val opts = BitmapFactory.Options().apply {
        inPreferredConfig = Bitmap.Config.ARGB_8888
      }
      bitmap = BitmapFactory.decodeFile(file.absolutePath, opts)
      if (bitmap == null) {
        promise.resolve(Arguments.createMap().apply {
          putBoolean("decoded", false)
          putString("reason", "Failed to decode bitmap")
        })
        return
      }

      val results = reader.read(bitmap)
      val first = results.firstOrNull()
      val map = Arguments.createMap()
      if (first != null && !first.text.isNullOrEmpty()) {
        map.putBoolean("decoded", true)
        map.putString("text", first.text)
        map.putString("format", first.format.name)
        map.putString("decoder", "zxing-cpp")
      } else {
        map.putBoolean("decoded", false)
        map.putString("decoder", "zxing-cpp")
      }
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("E_BARCODE_DECODE", e.message, e)
    } finally {
      bitmap?.recycle()
    }
  }
}
