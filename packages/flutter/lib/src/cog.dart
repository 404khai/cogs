import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';

import 'chassis.dart';
import 'config.dart';
import 'expressions.dart';
import 'painter.dart';

/// A live cog: eyes tween between expressions, follow the pointer, glance around when it is
/// idle and blink on their own schedule, and the status light and display modes animate.
///
/// Honours [MediaQueryData.disableAnimations]: the cog then snaps between expressions and holds still.
class Cog extends StatefulWidget {
  const Cog({super.key, required this.config, this.expression, this.track = true, this.size = 160, this.semanticLabel});

  /// Build one from cog JSON (`cogs/unit@1`). Bad fields fall back to defaults; unreadable JSON throws a [FormatException].
  factory Cog.fromJson(String json, {Key? key, String? expression, bool track = true, double size = 160}) =>
      Cog(key: key, config: CogConfig.fromJson(json), expression: expression, track: track, size: size);

  final CogConfig config;

  /// Override the configured expression (e.g. on hover).
  final String? expression;

  /// Follow the pointer with the eyes (mouse hover, or touches anywhere in the app).
  final bool track;

  /// Width and height. The cog is drawn in a square.
  final double size;

  /// Defaults to “Rivet, a octa cog looking idle”, as on the web.
  final String? semanticLabel;

  @override
  State<Cog> createState() => _CogState();
}

class _CogState extends State<Cog> with SingleTickerProviderStateMixin {
  late final Ticker _ticker = createTicker(_tick);
  late final ValueNotifier<CogFrame> _frame;
  final _rng = math.Random();

  late EyeP _l, _r;
  Offset _gaze = Offset.zero, _gazeT = Offset.zero;
  double _blinkStart = -1, _nextBlink = 0, _nextSacc = 0;
  Offset? _pointer;
  double _pointerT = -1e9;
  double _now = 0;
  bool _still = false;

  Expression get _expr => expressionById(widget.expression ?? widget.config.expression);

  double _rand(double a, double b) => a + _rng.nextDouble() * (b - a);

  @override
  void initState() {
    super.initState();
    _l = _expr.L;
    _r = _expr.R;
    _nextBlink = _rand(0.8, 3);
    _frame = ValueNotifier(CogFrame(l: _l, r: _r));
    GestureBinding.instance.pointerRouter.addGlobalRoute(_onPointer);
    _ticker.start();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _still = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
  }

  @override
  void dispose() {
    GestureBinding.instance.pointerRouter.removeGlobalRoute(_onPointer);
    _ticker.dispose();
    _frame.dispose();
    super.dispose();
  }

  void _onPointer(PointerEvent e) {
    if (e is PointerHoverEvent || e is PointerMoveEvent || e is PointerDownEvent) {
      _pointer = e.position;
      _pointerT = _now;
    }
  }

  void _tick(Duration elapsed) {
    final t = elapsed.inMicroseconds / 1e6;
    _now = t;
    final ex = _expr;
    final cf = widget.config;

    // Tween eye parameters toward the target expression.
    final k = _still ? 1.0 : 0.2;
    _l = _l.toward(ex.L, k);
    _r = _r.toward(ex.R, k);

    // Gaze: follow pointer while it is moving, otherwise wander.
    final box = context.findRenderObject() as RenderBox?;
    final fresh = t - _pointerT < 2.5 && _pointer != null;
    if (widget.track && fresh && box != null && box.hasSize) {
      final c = box.localToGlobal(box.size.center(Offset.zero));
      final dx = (_pointer!.dx - c.dx) / math.max(260, box.size.width * 0.9);
      final dy = (_pointer!.dy - c.dy) / math.max(260, box.size.height * 0.9);
      final m = math.sqrt(dx * dx + dy * dy);
      final s = (m > 1 ? 1 / m : 1) * cf.curiosity;
      _gazeT = Offset(dx * s, dy * s);
    } else if (t > _nextSacc && !_still) {
      final a = _rand(0, math.pi * 2);
      final m = _rand(0, 0.7) * cf.curiosity;
      _gazeT = _rng.nextDouble() < 0.35 ? Offset.zero : Offset(math.cos(a) * m, math.sin(a) * m * 0.7);
      _nextSacc = t + _rand(0.9, 3.2);
    }
    _gaze += (_gazeT - _gaze) * 0.16;

    // Blink.
    if (cf.blink > 0.02 && t > _nextBlink && !_still) {
      _blinkStart = t;
      final double = _rng.nextDouble() < 0.18;
      _nextBlink = t + (double ? 0.26 : _rand(1.4, 5.2) / (0.3 + cf.blink * 1.6));
    }
    final bt = t - _blinkStart;
    final blink = _blinkStart >= 0 && bt < 0.18 ? math.sin(math.pi * bt / 0.18) : 0.0;

    _frame.value = CogFrame(l: _l, r: _r, gaze: _gaze, blink: blink, time: _still ? 0 : t);
  }

  @override
  Widget build(BuildContext context) {
    final cf = widget.config;
    final ch = chassisById(cf.chassis);
    return Semantics(
      image: true,
      label: widget.semanticLabel ?? '${cf.name}, a ${ch.name.toLowerCase()} cog looking ${_expr.name.toLowerCase()}',
      child: RepaintBoundary(
        child: CustomPaint(
          size: Size.square(widget.size),
          painter: CogPainter.live(config: cf, frames: _frame),
        ),
      ),
    );
  }
}
