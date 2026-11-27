import 'dart:math' as math;

/// A gear in a meshing train: tooth count, centre, phase (radians) and spin direction.
class MeshGear {
  const MeshGear({required this.z, required this.cx, required this.cy, required this.phase, required this.dir});
  final int z;
  final double cx, cy, phase;
  final int dir;
}

/// Meshing gear trains. Gears are chained by pitch radius (module × teeth / 2) and phased so every
/// tooth sits in its neighbour's gap. Spin each at a period ∝ its teeth, alternating direction, and
/// they stay meshed forever. [links] are `(teeth, degrees from the previous gear)`.
List<MeshGear> meshChain(double module, ({int z, double cx, double cy}) start, List<({int z, double deg})> links) {
  final out = [MeshGear(z: start.z, cx: start.cx, cy: start.cy, phase: 0, dir: 1)];
  for (final l in links) {
    final a = out.last;
    final ra = (module * a.z) / 2;
    final rb = (module * l.z) / 2;
    final phi = (l.deg * math.pi) / 180;
    final ta = (math.pi * 2) / a.z;
    final tb = (math.pi * 2) / l.z;
    final delta = ((a.phase - phi) % ta + ta) % ta;
    out.add(MeshGear(
      z: l.z,
      cx: a.cx + (ra + rb) * math.cos(phi),
      cy: a.cy + (ra + rb) * math.sin(phi),
      phase: phi + math.pi - (delta / ta + 0.5) * tb,
      dir: -a.dir,
    ));
  }
  return out;
}
