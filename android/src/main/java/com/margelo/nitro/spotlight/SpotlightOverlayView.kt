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
    strokeWidth = borderWidth.coerceAtLeast(0f) * density
  }

  // -------------------------------------------------------------------------
  // Geometry
  // -------------------------------------------------------------------------

  /**
   * The requested highlight rect expressed in React Native window coordinates
   * (DIP units, as returned by measureInWindow on Android).
   */
  private val windowRectDp = RectF()
  private val overlayOrigin = IntArray(2)
  private val visibleWindowFrame = Rect()

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

    val centerX = currentLocalPx.centerX()
    val centerY = currentLocalPx.centerY()
    animateTo(RectF(centerX, centerY, centerX, centerY), durationMs, onFinished)
  }

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)

    if (changed && !windowRectDp.isEmpty) {
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
   * pixel coordinates.
   *
   * Android RN returns measureInWindow in DIPs and relative to the visible
   * window frame, while Android Views draw/hit-test in physical pixels and
   * getLocationOnScreen() is screen-space. Reconstruct screen pixels by
   * multiplying by density and adding the visible window frame offset, then
   * subtract this overlay's screen origin.
   */
  private fun windowDpToLocalPx(windowDp: RectF): RectF = traceSection(TRACE_WINDOW_TO_LOCAL) {
    if (windowDp.isEmpty) return@traceSection RectF()

    getLocationOnScreen(overlayOrigin)
    getWindowVisibleDisplayFrame(visibleWindowFrame)

    val screenLeft = windowDp.left * density + visibleWindowFrame.left
    val screenTop = windowDp.top * density + visibleWindowFrame.top
    val screenRight = windowDp.right * density + visibleWindowFrame.left
    val screenBottom = windowDp.bottom * density + visibleWindowFrame.top

    RectF(
      screenLeft - overlayOrigin[0],
      screenTop - overlayOrigin[1],
      screenRight - overlayOrigin[0],
      screenBottom - overlayOrigin[1],
    )
  }

  private fun rebuildHolePath() = traceSection(TRACE_REBUILD_HOLE) {
    overlayPath.reset()
    overlayPath.fillType = Path.FillType.EVEN_ODD
    holePath.reset()
    holeRegion.setEmpty()

    if (currentLocalPx.isEmpty || width == 0 || height == 0) return@traceSection

    val pad = padding * density
    val radius = (borderRadius + padding).coerceAtLeast(0f) * density

    cutRect.set(
      currentLocalPx.left - pad,
      currentLocalPx.top - pad,
      currentLocalPx.right + pad,
      currentLocalPx.bottom + pad,
    )

    holePath.addRoundRect(cutRect, radius, radius, Path.Direction.CW)

    // Use the physical screen bounds in local coordinates as the outer EVEN_ODD
    // rect. This is equivalent to iOS's window.map { convert($0.bounds, from: nil) }.
    //
    // Using view bounds (0, 0, width, height) fails when the view is inside the
    // React tree below the nav header — the hole's top (padded) can be negative,
    // causing EVEN_ODD inversion.
    //
    // Using visibleWindowFrame fails when the view is at y=0 (root-level teleport) —
    // visibleWindowFrame.top = statusBarHeight, so outerTop > 0 and the status bar
    // strip is left outside the outer rect (not dimmed).
    //
    // Physical screen bounds converted to local space always contain the hole and
    // correctly dim the full screen regardless of where the view is positioned.
    getLocationOnScreen(overlayOrigin)
    val screenW = resources.displayMetrics.widthPixels.toFloat()
    val screenH = resources.displayMetrics.heightPixels.toFloat()
    overlayPath.addRect(
      -overlayOrigin[0].toFloat(),
      -overlayOrigin[1].toFloat(),
      screenW - overlayOrigin[0],
      screenH - overlayOrigin[1],
      Path.Direction.CW,
    )
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
    ringPaint.strokeWidth = borderWidth.coerceAtLeast(0f) * density
  }

  private fun dimColor(): Int = Color.argb(
    (dimOpacity.coerceIn(0f, 1f) * 255).toInt(),
    0, 0, 0,
  )

  private fun parseBorderColor(value: String): Int =
    runCatching { Color.parseColor(value) }.getOrDefault(Color.WHITE)

  private val density: Float
    get() = resources.displayMetrics.density

  private companion object {
    private const val TRACE_ON_DRAW = "Spotlight.onDraw"
    private const val TRACE_TOUCH = "Spotlight.dispatchTouchEvent"
    private const val TRACE_WINDOW_TO_LOCAL = "Spotlight.windowDpToLocalPx"
    private const val TRACE_REBUILD_HOLE = "Spotlight.rebuildHolePath"
  }
}
