import UIKit
import NitroModules

// MARK: - Overlay Drawing View

/// Native overlay based on the same even-odd mask technique used by
/// react-native-hole-view. The overlay path is the full view bounds plus one
/// rounded "hole" path, so Core Animation fills the dimmed area while leaving
/// the target rect transparent.
// SpotlightOverlayView.swift

final class SpotlightOverlayView: UIView, CAAnimationDelegate {
  var dimOpacity: CGFloat  = 0.55 { didSet { redraw(animated: false) } }
  var cornerRadius: CGFloat = 12  { didSet { redraw(animated: false) } }
  var padding: CGFloat      = 6   { didSet { redraw(animated: false) } }

  private let overlayLayer = CAShapeLayer()
  private let ringLayer    = CAShapeLayer()

  // Stored in WINDOW coordinates (what JS passes via pageX/pageY)
  private var windowRect   = CGRect.zero
  private var currentPath: UIBezierPath?

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    backgroundColor = .clear

    overlayLayer.fillRule = .evenOdd
    overlayLayer.shouldRasterize = true
    overlayLayer.rasterizationScale = UIScreen.main.scale

    ringLayer.fillColor   = UIColor.clear.cgColor
    ringLayer.strokeColor = UIColor.white.cgColor
    ringLayer.lineWidth   = 1

    layer.addSublayer(overlayLayer)
    layer.addSublayer(ringLayer)
  }

  required init?(coder: NSCoder) { fatalError() }

  override func layoutSubviews() {
    super.layoutSubviews()

    // Layers must match the view's own bounds — local space starts at (0,0)
    overlayLayer.frame = bounds
    ringLayer.frame    = bounds

    // Redraw because bounds may have changed (rotation, split view, etc.)
    redraw(animated: false)
  }

  func setHighlight(_ rect: CGRect, animated: Bool, duration: TimeInterval = 0.25) {
    windowRect = rect
    redraw(animated: animated, duration: duration)
  }

  func clear() {
    windowRect = .zero
    redraw(animated: true, duration: 0.2)
  }

  // MARK: - Coordinate conversion (the core fix)

  /// Convert window-space rect into the local coordinate space of this view.
  /// This is what was missing — without this, pageX/pageY from JS are used
  /// directly as if the view starts at (0,0) in the window, which it doesn't.
  private func localRect(from windowSpaceRect: CGRect) -> CGRect {
    guard let window = self.window else {
      // View not yet in hierarchy — use as-is (will correct on next layoutSubviews)
      return windowSpaceRect
    }
    // convert(_:from:) maps from window coordinate space into self's local space
    return convert(windowSpaceRect, from: window)
  }

  // MARK: - Drawing

  private func redraw(animated: Bool, duration: TimeInterval = 0.25) {
    let nextPath     = makeOverlayPath()
    let nextRingPath = makeRingPath()
    let oldPath      = currentPath
    currentPath      = nextPath

    overlayLayer.fillColor = UIColor.black.withAlphaComponent(dimOpacity).cgColor

    guard animated else {
      overlayLayer.removeAnimation(forKey: "path")
      ringLayer.removeAnimation(forKey: "path")
      overlayLayer.path = nextPath?.cgPath
      ringLayer.path    = nextRingPath?.cgPath
      return
    }

    animate(layer: overlayLayer, from: oldPath?.cgPath ?? overlayLayer.path, to: nextPath?.cgPath, duration: duration)
    animate(layer: ringLayer,    from: ringLayer.path,                        to: nextRingPath?.cgPath, duration: duration)
  }

  private func makeOverlayPath() -> UIBezierPath? {
    guard !windowRect.isEmpty else { return nil }
    let path = UIBezierPath()
    path.usesEvenOddFillRule = true
    path.append(UIBezierPath(rect: bounds))  // full local bounds
    path.append(makeHolePath())
    return path
  }

  private func makeRingPath() -> UIBezierPath? {
    guard !windowRect.isEmpty else { return nil }
    return makeHolePath()
  }

  private func makeHolePath() -> UIBezierPath {
    // ✅ Convert to local space FIRST, then expand by padding
    let localTargetRect = localRect(from: windowRect)
    let cutRect = localTargetRect.insetBy(dx: -padding, dy: -padding)
    return UIBezierPath(roundedRect: cutRect, cornerRadius: cornerRadius + padding)
  }

  // MARK: - Animation

  private func animate(
    layer: CAShapeLayer,
    from: CGPath?,
    to: CGPath?,
    duration: TimeInterval
  ) {
    layer.removeAnimation(forKey: "path")
    layer.path = to

    guard let from, let to else { return }

    let anim = CABasicAnimation(keyPath: "path")
    anim.duration        = duration
    anim.fromValue       = from
    anim.toValue         = to
    anim.timingFunction  = CAMediaTimingFunction(name: .easeInEaseOut)
    anim.fillMode        = .forwards
    anim.isRemovedOnCompletion = true
    layer.add(anim, forKey: "path")
  }
}

// MARK: - Nitro HybridSpotlight Class

class HybridSpotlight: HybridSpotlightViewSpec {
  var onTargetLayout: ((Rect) -> Void)?

  let overlayView = SpotlightOverlayView()

  var dimOpacity: Double = 0.55 {
    didSet { overlayView.dimOpacity = CGFloat(dimOpacity) }
  }

  var cornerRadius: Double = 12 {
    didSet { overlayView.cornerRadius = CGFloat(cornerRadius) }
  }

  var padding: Double = 6 {
    didSet { overlayView.padding = CGFloat(padding) }
  }

  var view: UIView { overlayView }

  init(onTargetLayout: ((Rect) -> Void)? = nil) {
    self.onTargetLayout = onTargetLayout
  }

  func highlight(x: Double, y: Double, width: Double, height: Double) throws {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      let rect = CGRect(x: x, y: y, width: width, height: height)
      self.overlayView.setHighlight(rect, animated: false)
      self.onTargetLayout?(Rect(x: x, y: y, width: width, height: height))
    }
  }

  func highlightAnimated(x: Double, y: Double, width: Double, height: Double, durationMs: Double) throws {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      let rect = CGRect(x: x, y: y, width: width, height: height)
      self.overlayView.setHighlight(rect, animated: true, duration: durationMs / 1000)
      self.onTargetLayout?(Rect(x: x, y: y, width: width, height: height))
    }
  }

  func clear() throws {
    DispatchQueue.main.async { [weak self] in
      self?.overlayView.clear()
    }
  }

  // Keep this API for compatibility. In the example, target measurement is done on
  // the JS side with `measureInWindow`, which avoids depending on React Native's
  // private Fabric presenter types from Swift.
  func measureViewByTag(reactTag: Double) -> Rect {
    return Rect(x: 0, y: 0, width: 0, height: 0)
  }
}
