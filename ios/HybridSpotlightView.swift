import UIKit

// MARK: - SpotlightOverlayView

final class SpotlightOverlayView: UIView {

  // MARK: - Config
  var dimOpacity: CGFloat   = 0.55 { didSet { redraw(animated: false) } }
  var cornerRadius: CGFloat = 12   { didSet { redraw(animated: false) } }
  var padding: CGFloat      = 6    { didSet { redraw(animated: false) } }

  // MARK: - Private
  private let overlayLayer = CAShapeLayer()
  private let ringLayer    = CAShapeLayer()
  private var windowRect   = CGRect.zero
  private var currentPath: UIBezierPath?

  // MARK: - Init
  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
    backgroundColor = .clear

    overlayLayer.fillRule = .evenOdd
    // No shouldRasterize — causes subpixel compositing shift on 3x screens

    ringLayer.fillColor   = UIColor.clear.cgColor
    ringLayer.strokeColor = UIColor.white.cgColor
    ringLayer.lineWidth   = 1.5

    layer.addSublayer(overlayLayer)
    layer.addSublayer(ringLayer)
  }

  required init?(coder: NSCoder) { fatalError() }

  // MARK: - Layout

  override func layoutSubviews() {
    super.layoutSubviews()
    updateLayerFrames()
    redraw(animated: false)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil else { return }
    updateLayerFrames()

    // Pre-warm: commit empty paths so CALayer is already in the render
    // tree when the first highlight fires — eliminates cold-start stutter
    overlayLayer.path = UIBezierPath(rect: .zero).cgPath
    ringLayer.path    = UIBezierPath(rect: .zero).cgPath

    redraw(animated: false)
  }

  override func didMoveToSuperview() {
    super.didMoveToSuperview()
    setNeedsLayout()
  }

  // MARK: - Layer frames

  private func updateLayerFrames() {
    guard let window else {
      overlayLayer.frame = bounds
      ringLayer.frame    = bounds
      return
    }

    // Use screen coordinate space instead of window.bounds.
    // requireFullScreen: true can offset window.bounds from the true
    // screen origin, making convert(from: window) return wrong coords.
    // UIScreen.main.bounds is always (0, 0, screenW, screenH) — immune
    // to window frame changes caused by requireFullScreen.
    let screenBoundsInLocal = window.screen.coordinateSpace
      .convert(UIScreen.main.bounds, to: self.coordinateSpace)

    overlayLayer.frame = screenBoundsInLocal
    ringLayer.frame    = screenBoundsInLocal
  }

  // MARK: - Public API

  func setHighlight(_ rect: CGRect, animated: Bool, duration: TimeInterval = 0.25) {
    windowRect = rect
    redraw(animated: animated, duration: duration)
  }

  func clear(animated: Bool = true, duration: TimeInterval = 0.2) {
    windowRect = .zero
    redraw(animated: animated, duration: duration)
  }

  // MARK: - Coordinate conversion

  // JS passes pageX/pageY from measureInWindow — screen-space points.
  // Convert through screen coordinate space (not window) so requireFullScreen
  // window offsets don't affect the hole position.
  private func localRect(from screenSpaceRect: CGRect) -> CGRect {
    guard let window else { return screenSpaceRect }
    return window.screen.coordinateSpace
      .convert(screenSpaceRect, to: self.coordinateSpace)
  }

  // MARK: - Drawing

  private func redraw(animated: Bool, duration: TimeInterval = 0.25) {
    let nextPath     = makeOverlayPath()
    let nextRingPath = makeRingPath()
    let oldPath      = currentPath
    currentPath      = nextPath

    overlayLayer.fillColor = UIColor.black.withAlphaComponent(dimOpacity).cgColor

    if animated {
      animate(
        layer: overlayLayer,
        from: oldPath?.cgPath ?? overlayLayer.presentation()?.path ?? overlayLayer.path,
        to: nextPath?.cgPath,
        duration: duration
      )
      animate(
        layer: ringLayer,
        from: ringLayer.presentation()?.path ?? ringLayer.path,
        to: nextRingPath?.cgPath,
        duration: duration
      )
    } else {
      overlayLayer.removeAnimation(forKey: "path")
      ringLayer.removeAnimation(forKey: "path")
      overlayLayer.path = nextPath?.cgPath
      ringLayer.path    = nextRingPath?.cgPath
    }
  }

  private func makeHolePath() -> UIBezierPath {
    let local   = localRect(from: windowRect)
    let cutRect = local.insetBy(dx: -padding, dy: -padding)
    return UIBezierPath(
      roundedRect: cutRect,
      cornerRadius: cornerRadius + padding
    )
  }

  private func makeOverlayPath() -> UIBezierPath? {
    guard !windowRect.isEmpty else { return nil }
    let path = UIBezierPath()
    path.usesEvenOddFillRule = true
    // overlayLayer.bounds is screen-sized after updateLayerFrames
    path.append(UIBezierPath(rect: overlayLayer.bounds))
    path.append(makeHolePath())
    return path
  }

  private func makeRingPath() -> UIBezierPath? {
    guard !windowRect.isEmpty else { return nil }
    return makeHolePath()
  }

  // MARK: - Animation
  private func animate(
    layer: CAShapeLayer,
    from: CGPath?,
    to: CGPath?,
    duration: TimeInterval
  ) {
    // Use presentation layer for smooth mid-animation interruption
    let actualFrom = layer.presentation()?.path ?? from

    layer.removeAnimation(forKey: "path")
    layer.path = to

    guard let actualFrom, let to else { return }

    let anim = CABasicAnimation(keyPath: "path")
    anim.fromValue             = actualFrom
    anim.toValue               = to
    anim.duration              = duration
    anim.timingFunction        = CAMediaTimingFunction(name: .easeInEaseOut)
    anim.isRemovedOnCompletion = true
    // No fillMode: .forwards — redundant with isRemovedOnCompletion = true
    //    and causes stale path to flash after animation ends
    layer.add(anim, forKey: "path")
  }
}

// MARK: - HybridSpotlightView

class HybridSpotlightView: HybridSpotlightViewSpec {

  // MARK: - Nitro
  private let overlayView = SpotlightOverlayView()
  var view: UIView { overlayView }

  // MARK: - Props
  var dimOpacity: Double = 0.55 {
    didSet { overlayView.dimOpacity = CGFloat(dimOpacity) }
  }

  var cornerRadius: Double = 12 {
    didSet { overlayView.cornerRadius = CGFloat(cornerRadius) }
  }

  var padding: Double = 6 {
    didSet { overlayView.padding = CGFloat(padding) }
  }

  var onTargetLayout: ((Rect) -> Void)?

  // MARK: - Methods
  func highlight(x: Double, y: Double, width: Double, height: Double) throws {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      overlayView.setHighlight(
        CGRect(x: x, y: y, width: width, height: height),
        animated: false
      )
      onTargetLayout?(Rect(x: x, y: y, width: width, height: height))
    }
  }

  func highlightAnimated(
    x: Double, y: Double,
    width: Double, height: Double,
    durationMs: Double
  ) throws {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      overlayView.setHighlight(
        CGRect(x: x, y: y, width: width, height: height),
        animated: true,
        duration: durationMs / 1000
      )
      onTargetLayout?(Rect(x: x, y: y, width: width, height: height))
    }
  }

  func clear() throws {
    DispatchQueue.main.async { [weak self] in
      self?.overlayView.clear()
    }
  }

  func measureViewByTag(reactTag: Double) -> Rect {
    return Rect(x: 0, y: 0, width: 0, height: 0)
  }
}
