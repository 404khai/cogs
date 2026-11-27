import 'package:cogs/cogs.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() => runApp(const StudioApp());

class StudioApp extends StatelessWidget {
  const StudioApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'cogs',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(colorSchemeSeed: const Color(0xff3657d8), scaffoldBackgroundColor: const Color(0xffeeece6)),
        home: const Studio(),
      );
}

/// A pocket version of the web studio: the unit, its parts, its JSON and the roster.
class Studio extends StatefulWidget {
  const Studio({super.key});

  @override
  State<Studio> createState() => _StudioState();
}

class _StudioState extends State<Studio> {
  CogConfig cog = logoCog;
  String? hover;

  void set(CogConfig c) => setState(() => cog = c);

  Future<void> paste() async {
    final text = (await Clipboard.getData(Clipboard.kTextPlain))?.text ?? '';
    final res = parseCog(text);
    if (!mounted) return;
    final msg = switch (res) {
      CogParsed(:final config, :final warnings) => () {
          set(config);
          return warnings.isEmpty ? 'Built ${config.name}.' : warnings.join('\n');
        }(),
      CogParseError(:final error) => error,
    };
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> copy() async {
    await Clipboard.setData(ClipboardData(text: cog.toJson()));
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cog JSON copied.')));
  }

  @override
  Widget build(BuildContext context) {
    final mono = Theme.of(context).textTheme.bodySmall?.copyWith(fontFamily: 'monospace');
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: Text('${cog.name}  ·  ${serial(cog)}', style: mono?.copyWith(fontSize: 14)),
        actions: [
          IconButton(tooltip: 'Randomize', icon: const Icon(Icons.casino_outlined), onPressed: () => set(randomConfig(cog))),
          IconButton(tooltip: 'Copy JSON', icon: const Icon(Icons.copy_all_outlined), onPressed: copy),
          IconButton(tooltip: 'Paste JSON', icon: const Icon(Icons.content_paste_go_outlined), onPressed: paste),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: MouseRegion(
              onEnter: (_) => setState(() => hover = 'happy'),
              onExit: (_) => setState(() => hover = null),
              child: Cog(config: cog, expression: hover, size: 260),
            ),
          ),
          _Section('Chassis', [
            for (final c in chassisList)
              _Pick(
                selected: cog.chassis == c.id,
                onTap: () => set(cog.copyWith(chassis: c.id)),
                child: SizedBox.square(dimension: 44, child: CustomPaint(painter: CogPainter(config: cog.copyWith(chassis: c.id, screen: ScreenMode.eyes)))),
              ),
          ]),
          _Section('Expression', [
            for (final e in expressions)
              ChoiceChip(
                  label: Text(e.name), selected: cog.expression == e.id, onSelected: (_) => set(cog.copyWith(expression: e.id, screen: ScreenMode.eyes))),
          ]),
          _Section('Display', [
            for (final s in ScreenMode.values)
              ChoiceChip(label: Text(s.label), tooltip: s.note, selected: cog.screen == s, onSelected: (_) => set(cog.copyWith(screen: s))),
          ]),
          _Section('Paint', [
            for (final p in paints) _Swatch(p, selected: cog.color == p.hex, onTap: () => set(cog.copyWith(color: p.hex))),
          ]),
          _Section('Glow', [
            for (final p in glows) _Swatch(p, selected: cog.glow == p.hex, onTap: () => set(cog.copyWith(glow: p.hex))),
          ]),
          _Slider('Core charge', cog.charge, (v) => set(cog.copyWith(charge: v))),
          _Slider('Curiosity', cog.curiosity, (v) => set(cog.copyWith(curiosity: v))),
          _Slider('Blink rate', cog.blink, (v) => set(cog.copyWith(blink: v))),
          SwitchListTile(title: const Text('Pupils'), value: cog.pupils, onChanged: (v) => set(cog.copyWith(pupils: v))),
          const SizedBox(height: 24),
          Text('Roster', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              for (final (unit, role) in roster)
                InkWell(
                  onTap: () => set(unit),
                  child: Column(children: [
                    Cog(config: unit, size: 96, track: false),
                    Text(unit.name, style: Theme.of(context).textTheme.labelLarge),
                    Text(role, style: mono),
                  ]),
                ),
            ],
          ),
          const SizedBox(height: 24),
          SelectableText(cog.toJson(), style: mono),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section(this.title, this.children);
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title.toUpperCase(), style: Theme.of(context).textTheme.labelSmall?.copyWith(letterSpacing: 1.4)),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: children),
        ]),
      );
}

class _Pick extends StatelessWidget {
  const _Pick({required this.selected, required this.onTap, required this.child});
  final bool selected;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: selected ? Theme.of(context).colorScheme.primary : Colors.transparent, width: 2),
          ),
          child: child,
        ),
      );
}

class _Swatch extends StatelessWidget {
  const _Swatch(this.paint, {required this.selected, required this.onTap});
  final CogPaint paint;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Tooltip(
        message: paint.name,
        child: _Pick(
          selected: selected,
          onTap: onTap,
          child: CircleAvatar(radius: 14, backgroundColor: hexColor(paint.hex)),
        ),
      );
}

class _Slider extends StatelessWidget {
  const _Slider(this.label, this.value, this.onChanged);
  final String label;
  final double value;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) => Row(children: [
        SizedBox(width: 110, child: Text(label)),
        Expanded(child: Slider(value: value, onChanged: onChanged)),
        SizedBox(width: 40, child: Text(value.toStringAsFixed(2))),
      ]);
}
