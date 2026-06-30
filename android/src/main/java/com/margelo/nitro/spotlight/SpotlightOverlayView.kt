package com.margelo.nitro.spotlight

import android.animation.Animator
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Region
import android.os.Trace
import android.view.MotionEvent
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout

internal class SpotlightOverlayView(
  context: Context,
) : FrameLayout(context) {

  // -------------------------------------------------------------------------
  // Public properties
  // -------------------------------------------------------------------------

  var dimOpacity: Float = 0.55f
    set(value) {
      if (field == value) return
      field = value
      updateDimPaintColor()
      invalidate()
    }

  var shape: String = "rect"
    set(value) {
      if (field == value) return
      field = value
      rebuildHolePath()
      invalidate()
    }

  var borderRadius: Float = 12f
    set(value) {
      if (field == value) return
      field = value
      rebuildHolePath()
      invalidate()
    }

  var padding: Float = 6f
    set(value) {
      if (field == value) return
      field = value
      rebuildHolePath()
      invalidate()
    }

  var borderWidth: Float = 1.5f
    set(value) {
      if (field == value) return
      field = value
      updateRingStrokeWidth()
      invalidate()
    }

  var borderColor: String = "#FFFFFF"
    set(value) {
      if (field == value) return
      field = value
      ringPaint.color = parseBorderColor(value)
      invalidate()
    }

  var allowOverlayClick: Boolean = false
    set(value) {
      if (field == value) return
      field = value
      rebuildHolePath()
    }

  var onBackdropPress: (() -> Unit)? = null

  // -------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------

  private val dimPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    style = Paint.Style.FILL
    color = dimColor()
  }

  private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    color = parseBorderColor(borderColor)
    style = Paint.Style.STROKE
    strokeWidth = borderWidth.coerceAtLeast(0f) * cachedDensity
  }

  // -------------------------------------------------------------------------
  // Geometry
  // -------------------------------------------------------------------------

  /**
   * The requested highlight rect expressed in React Native window coordinates
   * (DIP units, as returned by measureInWindow on Android).
   */
  private val windowRectDp = RectF()

  // Cached once per highlight/clear call — refreshed by refreshGeometryCache().
  // Calling getLocationOnScreen / getWindowVisibleDisplayFrame on every
  // ValueAnimator frame (60 fps) is expensive; these values don't change
  // during a 300 ms animation, so we snapshot them once up front.
  private val cachedOverlayOrigin = IntArray(2)
  private val cachedVisibleFrame = Rect()
  private val outerRectPath = Path()

  private val currentLocalPx = RectF()
  private val targetLocalPx = RectF()
  private val cutRect = RectF()
  private val overlayPath = Path().apply {
    fillType = Path.FillType.EVEN_ODD
  }
  private val holePath = Path()
  private val holeRegion = Region()
  private val holeClipRegion = Region()
  private val holeRegionBounds = Rect()
  private val holePathBounds = RectF()

  // -------------------------------------------------------------------------
  // Animation
  // -------------------------------------------------------------------------

  private var activeAnimator: ValueAnimator? = null

  // -------------------------------------------------------------------------
  // Touch state
  // -------------------------------------------------------------------------

  private var blockingTouch = false

  // -------------------------------------------------------------------------
  // Display-metric cache (refreshed in onLayout)
  // -------------------------------------------------------------------------

  private var cachedDensity: Float = resources.displayMetrics.density
  private var cachedScreenW: Float = resources.displayMetrics.widthPixels.toFloat()
  private var cachedScreenH: Float = resources.displayMetrics.heightPixels.toFloat()

  // -------------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------------

  init {
    // FrameLayout/ViewGroup defaults to WILL_NOT_DRAW when it has no
    // background. We draw the dim overlay in onDraw(), so opt in explicitly.
    setWillNotDraw(false)

    isClickable = false
    isFocusable = false
    isFocusableInTouchMode = false
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  fun setHighlight(
    xDp: Float,
    yDp: Float,
    widthDp: Float,
    heightDp: Float,
    animated: Boolean,
    durationMs: Long = 250L,
  ) {
    if (widthDp <= 0f || heightDp <= 0f) {
      clear(durationMs = 0L)
      return
    }

    val nextWindowRectDp = RectF(xDp, yDp, xDp + widthDp, yDp + heightDp)

    if (animated && activeAnimator?.isRunning == true && windowRectDp.approximatelyEquals(nextWindowRectDp)) {
      return
    }

    // React Native measureInWindow returns DIP coordinates relative to the
    // visible app window. Store the original JS values; convert only when we
    // know this overlay's current screen position.
    windowRectDp.set(nextWindowRectDp)

    // Guard: if not laid out yet, onLayout will apply windowRectDp.
    if (width == 0 || height == 0) return

    // Snapshot geometry once — avoids repeated system calls per animation frame.
    refreshGeometryCache()
    targetLocalPx.set(windowDpToLocalPx(windowRectDp))

    if (!animated || durationMs <= 0L) {
      cancelAnimation()
      currentLocalPx.set(targetLocalPx)
      rebuildHolePath()
      invalidate()
      return
    }

    animateTo(targetLocalPx, durationMs)
  }

  fun clear(durationMs: Long = 200L, onFinished: (() -> Unit)? = null) {
    if (windowRectDp.isEmpty && activeAnimator?.isRunning == true) {
      return
    }

    windowRectDp.setEmpty()

    if (durationMs <= 0L || currentLocalPx.isEmpty) {
      cancelAnimation()
      currentLocalPx.setEmpty()
      targetLocalPx.setEmpty()
      overlayPath.reset()
      holePath.reset()
      holeRegion.setEmpty()
      invalidate()
      onFinished?.invoke()
      return
    }

    // Snapshot geometry once before the collapse animation starts.
    refreshGeometryCache()

    val centerX = currentLocalPx.centerX()
    val centerY = currentLocalPx.centerY()
    animateTo(RectF(centerX, centerY, centerX, centerY), durationMs, onFinished)
  }

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)

    // Refresh cheap display-metric cache whenever the view is re-laid-out
    // (rotation, window resize, density change). The geometry cache
    // (overlay origin, visible frame, outer rect) is refreshed per highlight.
    cachedDensity = resources.displayMetrics.density
    cachedScreenW = resources.displayMetrics.widthPixels.toFloat()
    cachedScreenH = resources.displayMetrics.heightPixels.toFloat()

    if (changed && !windowRectDp.isEmpty) {
      refreshGeometryCache()
      targetLocalPx.set(windowDpToLocalPx(windowRectDp))
      cancelAnimation()
      currentLocalPx.set(targetLocalPx)
      rebuildHolePath()
      invalidate()
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  override fun onDetachedFromWindow() {
    cancelAnimation()
    super.onDetachedFromWindow()
  }

  // -------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------

  override fun onDraw(canvas: Canvas) = traceSection(TRACE_ON_DRAW) {
    super.onDraw(canvas)

    if (!hasActiveSpotlight()) return@traceSection

    canvas.drawPath(overlayPath, dimPaint)
    if (borderWidth > 0f) {
      canvas.drawPath(holePath, ringPaint)
    }
  }

  // -------------------------------------------------------------------------
  // Touch handling
  //
  // Strategy: never intercept. On DOWN, decide once whether the touch should
  // pass through to RN underneath or be blocked by the overlay. Carry that
  // decision through the rest of the gesture.
  //
  // When there is no active spotlight, dispatchTouchEvent returns false
  // immediately so Android continues hit-testing the next view in the
  // hierarchy — touches fall through to React Native content underneath.
  // -------------------------------------------------------------------------

  override fun onInterceptTouchEvent(event: MotionEvent): Boolean = false

  override fun dispatchTouchEvent(event: MotionEvent): Boolean = traceSection(TRACE_TOUCH) {
    // No spotlight active — let every touch fall through to RN underneath.
    if (!hasActiveSpotlight()) return@traceSection false

    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        val isBackdropTouch = !isTouchInsideHole(event.x.toInt(), event.y.toInt())

        if (allowOverlayClick && isBackdropTouch) {
          onBackdropPress?.invoke()
        }

        blockingTouch = !allowOverlayClick && isBackdropTouch
        // Return false for hole touches, and for all touches when allowOverlayClick
        // is true, so Android continues hit-testing and delivers the gesture to
        // RN underneath. onBackdropPress still fires for backdrop touches even
        // in pass-through mode.
        blockingTouch
      }
      MotionEvent.ACTION_UP -> {
        val wasBlocking = blockingTouch
        blockingTouch = false
        if (wasBlocking) {
          onBackdropPress?.invoke()
        }
        wasBlocking
      }
      MotionEvent.ACTION_POINTER_UP,
      MotionEvent.ACTION_CANCEL -> {
        val wasBlocking = blockingTouch
        blockingTouch = false
        wasBlocking
      }
      else -> blockingTouch
    }
  }

  override fun onTouchEvent(event: MotionEvent): Boolean = false

  // -------------------------------------------------------------------------
  // Geometry helpers
  // -------------------------------------------------------------------------

  private fun isTouchInsideHole(touchX: Int, touchY: Int): Boolean =
    !holeRegion.isEmpty && holeRegion.contains(touchX, touchY)

  /**
   * Convert a React Native measureInWindow rect into this overlay's local
   * DIP coordinates. Used by HybridSpotlightView to report onTargetLayout in
   * the same coordinate space that SpotlightTooltip uses for positioning.
   *
   * On non-edge-to-edge devices the result equals the input (overlay top ==
   * visibleWindowFrame.top). On edge-to-edge devices (mandatory on Android 15+)
   * the overlay sits at physical y=0 while measureInWindow is relative to
   * visibleWindowFrame.top, so this adds the status-bar height to x/y, aligning
   * the rect with the overlay's local origin.
   */
  fun windowDpToLocalDip(windowDp: RectF): RectF {
    val localPx = windowDpToLocalPx(windowDp)
    if (localPx.isEmpty) return RectF()
    return RectF(
      localPx.left / cachedDensity,
      localPx.top / cachedDensity,
      localPx.right / cachedDensity,
      localPx.bottom / cachedDensity,
    )
  }

  /**
   * Convert a React Native measureInWindow rect into this overlay's local
   * pixel coordinates using the cached geometry snapshot.
   *
   * Android RN returns measureInWindow in DIPs and relative to the visible
   * window frame, while Android Views draw/hit-test in physical pixels and
   * getLocationOnScreen() is screen-space. Reconstruct screen pixels by
   * multiplying by density and adding the visible window frame offset, then
   * subtract this overlay's screen origin.
   *
   * Must call refreshGeometryCache() before using this during an animation.
   */
  private fun windowDpToLocalPx(windowDp: RectF): RectF = traceSection(TRACE_WINDOW_TO_LOCAL) {
    if (windowDp.isEmpty) return@traceSection RectF()

    val screenLeft = windowDp.left * cachedDensity + cachedVisibleFrame.left
    val screenTop = windowDp.top * cachedDensity + cachedVisibleFrame.top
    val screenRight = windowDp.right * cachedDensity + cachedVisibleFrame.left
    val screenBottom = windowDp.bottom * cachedDensity + cachedVisibleFrame.top

    RectF(
      screenLeft - cachedOverlayOrigin[0],
      screenTop - cachedOverlayOrigin[1],
      screenRight - cachedOverlayOrigin[0],
      screenBottom - cachedOverlayOrigin[1],
    )
  }

  /**
   * Snapshot values that require system calls — called once per highlight/clear,
   * not per animation frame. Eliminates ~2 system calls × 18 frames @ 60 fps
   * during a typical 300 ms transition.
   */
  private fun refreshGeometryCache() {
    getLocationOnScreen(cachedOverlayOrigin)
    getWindowVisibleDisplayFrame(cachedVisibleFrame)

    // Pre-build the outer EVEN_ODD rect in local coordinates. This rect
    // covers the full physical screen and doesn't change during an animation,
    // so building it here (once) instead of inside rebuildHolePath() removes
    // a getLocationOnScreen call and two displayMetrics reads per frame.
    outerRectPath.rewind()
    outerRectPath.addRect(
      -cachedOverlayOrigin[0].toFloat(),
      -cachedOverlayOrigin[1].toFloat(),
      cachedScreenW - cachedOverlayOrigin[0],
      cachedScreenH - cachedOverlayOrigin[1],
      Path.Direction.CW,
    )
  }

  private fun rebuildHolePath() = traceSection(TRACE_REBUILD_HOLE) {
    overlayPath.reset()
    overlayPath.fillType = Path.FillType.EVEN_ODD
    holePath.reset()
    holeRegion.setEmpty()

    if (currentLocalPx.isEmpty || width == 0 || height == 0) return@traceSection

    val pad = padding * cachedDensity
    val radius = (borderRadius + padding).coerceAtLeast(0f) * cachedDensity

    cutRect.set(
      currentLocalPx.left - pad,
      currentLocalPx.top - pad,
      currentLocalPx.right + pad,
      currentLocalPx.bottom + pad,
    )

    // Use addRoundRect for both shapes so the path structure stays identical
    // (same element count/types) — allowing smooth ValueAnimator morphing between
    // rect and circle within the same tour. addOval produces a different internal
    // path structure and would cause an instant snap instead of a morph.
    val holeRadius = if (shape == "circle") {
      minOf(cutRect.width(), cutRect.height()) / 2f
    } else {
      radius
    }
    holePath.addRoundRect(cutRect, holeRadius, holeRadius, Path.Direction.CW)

    // Use the pre-built outer rect (physical screen bounds in local coords).
    // See refreshGeometryCache() for why we use screen bounds instead of
    // view bounds or visibleWindowFrame.
    overlayPath.addPath(outerRectPath)
    overlayPath.addPath(holePath)

    if (!allowOverlayClick) {
      holePath.computeBounds(holePathBounds, true)
      holePathBounds.roundOut(holeRegionBounds)
      holeClipRegion.set(holeRegionBounds)
      holeRegion.setPath(holePath, holeClipRegion)
    }
  }

  private fun hasActiveSpotlight(): Boolean =
    !currentLocalPx.isEmpty && !overlayPath.isEmpty

  // -------------------------------------------------------------------------
  // Animation
  // -------------------------------------------------------------------------

  private fun animateTo(target: RectF, durationMs: Long, onFinished: (() -> Unit)? = null) {
    cancelAnimation()

    if (durationMs <= 0L) {
      currentLocalPx.set(target)
      rebuildHolePath()
      invalidate()
      return
    }

    val from = if (currentLocalPx.isEmpty && !target.isEmpty) {
      RectF(target.centerX(), target.centerY(), target.centerX(), target.centerY())
    } else {
      RectF(currentLocalPx)
    }

    val to = RectF(target)

    activeAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
      duration = durationMs
      interpolator = DecelerateInterpolator()

      addUpdateListener { animation ->
        val p = animation.animatedValue as Float
        currentLocalPx.set(
          lerp(from.left,   to.left,   p),
          lerp(from.top,    to.top,    p),
          lerp(from.right,  to.right,  p),
          lerp(from.bottom, to.bottom, p),
        )
        rebuildHolePath()
        invalidate()
      }

      addListener(object : Animator.AnimatorListener {
        override fun onAnimationStart(animation: Animator) = Unit

        override fun onAnimationEnd(animation: Animator) {
          activeAnimator = null
          if (windowRectDp.isEmpty) {
            // Clear animation finished — reset everything.
            currentLocalPx.setEmpty()
            targetLocalPx.setEmpty()
            overlayPath.reset()
            holePath.reset()
            holeRegion.setEmpty()
            invalidate()
            onFinished?.invoke()
          }
        }

        override fun onAnimationCancel(animation: Animator) {
          activeAnimator = null
        }

        override fun onAnimationRepeat(animation: Animator) = Unit
      })

      start()
    }
  }

  private fun cancelAnimation() {
    activeAnimator?.cancel()
    activeAnimator = null
  }

  private fun RectF.approximatelyEquals(other: RectF, tolerance: Float = 0.5f): Boolean =
    kotlin.math.abs(left - other.left) <= tolerance &&
      kotlin.math.abs(top - other.top) <= tolerance &&
      kotlin.math.abs(right - other.right) <= tolerance &&
      kotlin.math.abs(bottom - other.bottom) <= tolerance

  private fun lerp(from: Float, to: Float, progress: Float): Float =
    from + (to - from) * progress

  private inline fun <T> traceSection(name: String, block: () -> T): T {
    if (!BuildConfig.DEBUG) return block()

    Trace.beginSection(name)
    return try {
      block()
    } finally {
      Trace.endSection()
    }
  }

  private fun updateDimPaintColor() {
    dimPaint.color = dimColor()
  }

  private fun updateRingStrokeWidth() {
    ringPaint.strokeWidth = borderWidth.coerceAtLeast(0f) * cachedDensity
  }

  private fun dimColor(): Int = Color.argb(
    (dimOpacity.coerceIn(0f, 1f) * 255).toInt(),
    0, 0, 0,
  )

  private fun parseBorderColor(value: String): Int =
    runCatching { Color.parseColor(value) }.getOrDefault(Color.WHITE)

  private companion object {
    private const val TRACE_ON_DRAW = "Spotlight.onDraw"
    private const val TRACE_TOUCH = "Spotlight.dispatchTouchEvent"
    private const val TRACE_WINDOW_TO_LOCAL = "Spotlight.windowDpToLocalPx"
    private const val TRACE_REBUILD_HOLE = "Spotlight.rebuildHolePath"
  }
}
