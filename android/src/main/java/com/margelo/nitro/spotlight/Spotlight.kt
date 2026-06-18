package com.margelo.nitro.spotlight

import android.animation.ValueAnimator
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.uimanager.ThemedReactContext

private class SpotlightOverlayView(context: ThemedReactContext) : View(context) {
  private val density = resources.displayMetrics.density
  private val overlayPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.BLACK
  }
  private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = Color.WHITE
    style = Paint.Style.STROKE
    strokeWidth = 2f * density
  }
  private val spotlightRect = RectF()
  private val animatedRect = RectF()
  private var animator: ValueAnimator? = null

  var dimOpacity: Double = 0.55
    set(value) {
      field = value
      invalidate()
    }

  var cornerRadiusDp: Double = 12.0
    set(value) {
      field = value
      invalidate()
    }

  var paddingDp: Double = 6.0
    set(value) {
      field = value
      invalidate()
    }

  init {
    setWillNotDraw(false)
    isClickable = false
  }

  fun setHighlight(x: Double, y: Double, width: Double, height: Double, animated: Boolean, durationMs: Long) {
    val target = RectF(
      (x * density).toFloat(),
      (y * density).toFloat(),
      ((x + width) * density).toFloat(),
      ((y + height) * density).toFloat()
    )

    animator?.cancel()

    if (!animated || spotlightRect.isEmpty) {
      spotlightRect.set(target)
      invalidate()
      return
    }

    val start = RectF(spotlightRect)
    animator = ValueAnimator.ofFloat(0f, 1f).apply {
      duration = durationMs
      interpolator = AccelerateDecelerateInterpolator()
      addUpdateListener { animation ->
        val progress = animation.animatedFraction
        spotlightRect.set(
          lerp(start.left, target.left, progress),
          lerp(start.top, target.top, progress),
          lerp(start.right, target.right, progress),
          lerp(start.bottom, target.bottom, progress)
        )
        invalidate()
      }
      start()
    }
  }

  fun clear() {
    animator?.cancel()
    spotlightRect.setEmpty()
    invalidate()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)

    if (spotlightRect.isEmpty) return

    val paddingPx = (paddingDp * density).toFloat()
    val radiusPx = ((cornerRadiusDp + paddingDp) * density).toFloat()
    animatedRect.set(spotlightRect)
    animatedRect.inset(-paddingPx, -paddingPx)

    overlayPaint.alpha = (dimOpacity.coerceIn(0.0, 1.0) * 255).toInt()

    val overlayPath = Path().apply {
      fillType = Path.FillType.EVEN_ODD
      addRect(0f, 0f, width.toFloat(), height.toFloat(), Path.Direction.CW)
      addRoundRect(animatedRect, radiusPx, radiusPx, Path.Direction.CW)
    }

    canvas.drawPath(overlayPath, overlayPaint)
    canvas.drawRoundRect(animatedRect, radiusPx, radiusPx, ringPaint)
  }

  private fun lerp(start: Float, end: Float, progress: Float): Float {
    return start + (end - start) * progress
  }
}

@DoNotStrip
class HybridSpotlight(private val context: ThemedReactContext) : HybridSpotlightSpec() {
  private val overlayView = SpotlightOverlayView(context)

  override val view: View = overlayView

  override var dimOpacity: Double = 0.55
    get() = overlayView.dimOpacity
    set(value) {
      field = value
      overlayView.dimOpacity = value
    }

  override var cornerRadius: Double = 12.0
    get() = overlayView.cornerRadiusDp
    set(value) {
      field = value
      overlayView.cornerRadiusDp = value
    }

  override var padding: Double = 6.0
    get() = overlayView.paddingDp
    set(value) {
      field = value
      overlayView.paddingDp = value
    }

  override fun highlight(x: Double, y: Double, width: Double, height: Double) {
    overlayView.post {
      overlayView.setHighlight(x, y, width, height, animated = false, durationMs = 0L)
    }
  }

  override fun highlightAnimated(x: Double, y: Double, width: Double, height: Double, durationMs: Double) {
    overlayView.post {
      overlayView.setHighlight(x, y, width, height, animated = true, durationMs = durationMs.toLong())
    }
  }

  override fun clear() {
    overlayView.post {
      overlayView.clear()
    }
  }

  override fun measureViewByTag(reactTag: Double): Rect {
    return Rect(x = 0.0, y = 0.0, width = 0.0, height = 0.0)
  }
}
