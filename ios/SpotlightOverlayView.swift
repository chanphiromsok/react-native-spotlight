import UIKit

// MARK: - SpotlightOverlayView

final class SpotlightOverlayView: UIView {

  // MARK: - Config

  var dimOpacity: CGFloat = 0.55 {
    didSet {
      guard oldValue != dimOpacity else { return }
      redraw(animated: false)
    }
  }

  var borderRadius: CGFloat = 12 {
    didSet {
      guard oldValue != borderRadius else { return }
      redraw(animated: false)
    }
  }

  var padding: CGFloat = 6 {
    didSet {
      guard oldValue != padding else { return }
      redraw(animated: false)
    }
  }

  var borderWidth: CGFloat = 1.5 {
    didSet {
      guard oldValue != borderWidth else { return }
      redraw(animated: false)
    }
  }

  var borderColor: String = "#FFFFFF" {
    didSet {
      guard oldValue != borderColor else { return }
      resolvedBorderColor = UIColor.spotlightColor(from: borderColor)
      ringLayer.strokeColor = resolvedBorderColor.cgColor
      redraw(animated: false)
    }
  }

  var allowOverlayClick = false

  var onBackdropPress: (() -> Void)?

  /// Use this only when your JS rect is true screen-space.
  /// For React Native `measureInWindow`, default should usually be false.
//   var useScreenCoordinates: Bool = false {
//     didSet { redraw(animated: false) }
//   }

  // MARK: - Private

  private let overlayLayer = CAShapeLayer()
  private let ringLayer = CAShapeLayer()

  /// Rect coming from JS.
  /// Usually from `measureInWindow`.
  private var sourceRect = CGRect.zero
  private var currentOverlayPath: UIBezierPath?
  private var currentHolePath: UIBezierPath?
  private var resolvedBorderColor = UIColor.white

  // MARK: - Init

  override init(frame: CGRect) {
    super.init(frame: frame)

    isUserInteractionEnabled = true
    backgroundColor = .clear

    overlayLayer.fillRule = .evenOdd
    overlayLayer.fillColor = UIColor.black.withAlphaComponent(dimOpacity).cgColor

    ringLayer.fillColor = UIColor.clear.cgColor
    ringLayer.strokeColor = resolvedBorderColor.cgColor
    ringLayer.lineWidth = borderWidth

    layer.addSublayer(overlayLayer)
    layer.addSublayer(ringLayer)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

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

    // Pre-warm layers to avoid first render stutter.
    overlayLayer.path = UIBezierPath(rect: .zero).cgPath
    ringLayer.path = UIBezierPath(rect: .zero).cgPath

    redraw(animated: false)
  }

  override func didMoveToSuperview() {
    super.didMoveToSuperview()
    setNeedsLayout()
  }

  // MARK: - Layer Frames

  private func updateLayerFrames() {
    CATransaction.begin()
    CATransaction.setDisableActions(true)

    // Important:
    // Keep layer coordinates same as this UIView.
    // Do not use UIScreen.main.bounds here.
    overlayLayer.frame = bounds
    ringLayer.frame = bounds

    CATransaction.commit()
  }

  // MARK: - Public API

  func setHighlight(
    _ rect: CGRect,
    animated: Bool,
    duration: TimeInterval = 0.25
  ) {
    if animated,
       rect.isApproximatelyEqual(to: sourceRect),
       hasRunningPathAnimation {
      return
    }

    sourceRect = rect
    redraw(animated: animated, duration: duration)
  }

  func clear(
    animated: Bool = true,
    duration: TimeInterval = 0.2
  ) {
    if sourceRect.isEmpty, hasRunningPathAnimation {
      return
    }

    sourceRect = .zero
    redraw(animated: animated, duration: duration)
  }

  // MARK: - Touch Handling

  override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
    guard !sourceRect.isEmpty, !allowOverlayClick else { return false }
    return isBackdropPoint(point)
  }

  override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    guard !sourceRect.isEmpty, isBackdropPoint(point) else { return nil }

    if allowOverlayClick {
      onBackdropPress?()
      return nil
    }

    return self
  }

  override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
    super.touchesEnded(touches, with: event)

    guard let touchPoint = touches.first?.location(in: self),
          point(inside: touchPoint, with: event)
    else { return }

    onBackdropPress?()
  }

  private func isBackdropPoint(_ point: CGPoint) -> Bool {
    !(currentHolePath?.contains(point) ?? false)
  }

  // MARK: - Coordinate Conversion

  private func localRect(from rect: CGRect) -> CGRect {
    guard let window else { return rect }

    return window.convert(rect, to: self)
    // if useScreenCoordinates {
    //   // Use this when rect is true screen-space.
    //   return window.screen.coordinateSpace.convert(
    //     rect,
    //     to: self.coordinateSpace
    //   )
    // } else {
    //   // Use this for React Native measureInWindow in normal window mode.
    //   return window.convert(rect, to: self)
    // }
  }

  // MARK: - Drawing

  private func redraw(
    animated: Bool,
    duration: TimeInterval = 0.25
  ) {
    overlayLayer.fillColor = UIColor.black.withAlphaComponent(dimOpacity).cgColor
    ringLayer.strokeColor = resolvedBorderColor.cgColor
    ringLayer.lineWidth = borderWidth
    ringLayer.isHidden = borderWidth <= 0

    let nextHolePath = makeHolePath()
    let nextOverlayPath = makeOverlayPath(holePath: nextHolePath)
    let nextRingPath = makeRingPath(holePath: nextHolePath)

    let oldOverlayPath = currentOverlayPath
    currentOverlayPath = nextOverlayPath
    currentHolePath = nextHolePath

    if animated {
      animate(
        layer: overlayLayer,
        from: oldOverlayPath?.cgPath ?? overlayLayer.presentation()?.path ?? overlayLayer.path,
        to: nextOverlayPath?.cgPath,
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

      overlayLayer.path = nextOverlayPath?.cgPath
      ringLayer.path = nextRingPath?.cgPath
    }
  }

  private func makeHolePath() -> UIBezierPath? {
    guard !sourceRect.isEmpty else { return nil }

    let local = localRect(from: sourceRect)

    let cutRect = local.insetBy(
      dx: -padding,
      dy: -padding
    )

    return UIBezierPath(
      roundedRect: cutRect,
      cornerRadius: max(borderRadius + padding, 0)
    )
  }

  private func makeOverlayPath(holePath: UIBezierPath?) -> UIBezierPath? {
    guard let holePath else { return nil }

    let path = UIBezierPath()
    path.usesEvenOddFillRule = true

    // Layer frame == UIView bounds, so path must also use bounds.
    path.append(UIBezierPath(rect: bounds))
    path.append(holePath)

    return path
  }

  private func makeRingPath(holePath: UIBezierPath?) -> UIBezierPath? {
    holePath
  }

  // MARK: - Animation

  private var hasRunningPathAnimation: Bool {
    overlayLayer.animation(forKey: "path") != nil ||
      ringLayer.animation(forKey: "path") != nil
  }

  private func animate(
    layer: CAShapeLayer,
    from: CGPath?,
    to: CGPath?,
    duration: TimeInterval
  ) {
    let actualFrom = layer.presentation()?.path ?? from

    layer.removeAnimation(forKey: "path")
    layer.path = to

    guard let actualFrom, let to else { return }

    let anim = CABasicAnimation(keyPath: "path")
    anim.fromValue = actualFrom
    anim.toValue = to
    anim.duration = duration
    anim.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
    anim.isRemovedOnCompletion = true

    layer.add(anim, forKey: "path")
  }
}

private extension CGRect {
  func isApproximatelyEqual(
    to other: CGRect,
    tolerance: CGFloat = 0.5
  ) -> Bool {
    abs(origin.x - other.origin.x) <= tolerance &&
      abs(origin.y - other.origin.y) <= tolerance &&
      abs(size.width - other.size.width) <= tolerance &&
      abs(size.height - other.size.height) <= tolerance
  }
}

private extension UIColor {
  static func spotlightColor(from hexString: String) -> UIColor {
    var hex = hexString.trimmingCharacters(in: .whitespacesAndNewlines)
    if hex.hasPrefix("#") {
      hex.removeFirst()
    }

    var value: UInt64 = 0
    guard Scanner(string: hex).scanHexInt64(&value) else {
      return .white
    }

    switch hex.count {
    case 6:
      return UIColor(
        red: CGFloat((value & 0xFF0000) >> 16) / 255.0,
        green: CGFloat((value & 0x00FF00) >> 8) / 255.0,
        blue: CGFloat(value & 0x0000FF) / 255.0,
        alpha: 1.0
      )
    case 8:
      return UIColor(
        red: CGFloat((value & 0x00FF0000) >> 16) / 255.0,
        green: CGFloat((value & 0x0000FF00) >> 8) / 255.0,
        blue: CGFloat(value & 0x000000FF) / 255.0,
        alpha: CGFloat((value & 0xFF000000) >> 24) / 255.0
      )
    default:
      return .white
    }
  }
}
