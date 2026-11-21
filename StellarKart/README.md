# Stellar Kart (Unity 6)

An original arcade kart racer starring **Loki** and **Firo**: 8 karts, 3 laps around the floating *Nebula Loop* at dusk, drift boosts, items and local split-screen.

## Open it

1. Install any **Unity 6** editor (6000.0 LTS or newer) through Unity Hub.
2. In Hub, click **Add → Add project from disk** and pick this `StellarKart` folder. If Hub offers a newer Unity 6 version, accept it.
3. On first import, `StellarKartSetup` runs once. It:
   - assigns a URP pipeline asset (only if the project has none),
   - writes material templates to `Assets/StellarKart/Resources` so player builds keep their shaders,
   - creates `Assets/StellarKart/Scenes/StellarKart.unity` and adds it to Build Settings.
4. If Unity asks to enable the new Input System backend and restart, say **Yes**.
5. Open the `StellarKart` scene and press **Play**.

All the art, the track, the audio and the UI are generated in code, so nothing needs to be imported. If something looks off, use the menu **Stellar Kart → Repair Project Setup**.

**Fallback:** create a new project from Hub's **Universal 3D** template, then copy `Assets/StellarKart` into it.

## Controls

| | Solo | Loki (duo, top screen) | Firo (duo, bottom screen) |
|---|---|---|---|
| Drive | WASD / Arrows | WASD | Arrows |
| Drift | Space / Shift | Left Shift / Space | Right Shift |
| Item | E / Q / Ctrl / Enter | E / Q | Enter / Right Ctrl |
| Respawn | R | R | Backspace |

**Gamepad:** RT or A for gas, LT or B to brake, LB/RB to drift, X for items, Y to respawn. On the title screen, START is solo and SELECT is duo. In duo with two pads, pad 1 drives Loki and pad 2 drives Firo. With one pad, it drives Firo.

**Title screen:** `1` = solo, `2` = Loki & Firo split-screen. **Esc** quits back to the title.

## Mechanics

- **Drift boost:** hold drift while steering into a turn. The sparks charge from cyan to violet to gold, and releasing gives a bigger boost at each tier.
- **Items** (rolled by race position, so the leaders get defensive items and the pack gets speed):
  - **Comet / Comet x3:** a speed burst.
  - **Nova Orb:** a homing shot that follows the track and then locks onto the kart ahead.
  - **Stardust Mine:** a trap dropped behind you.
  - **Orbit Shield:** blocks the next hit.
- **Boost pads** are the orange chevrons. Driving on the teal shoulders halves your speed.
- **AI:** follows a racing line with lane changes, drifts long bends, times its items and backs out when stuck. A light rubber band keeps the pack near the humans.

## Code map (`Assets/StellarKart/Scripts`)

| File | What it does |
|---|---|
| `GameFlow.cs` | Bootstraps the game in any scene; handles title → countdown → race → results, the roster, cameras, places and SFX |
| `Track.cs` | `TrackPath` (sampled centre line and progress) plus mesh generation for the road, curbs, walls, scenery and start arch |
| `Kart.cs` | Arcade physics, drift tiers, boosts, spin-outs, respawn and kart visuals |
| `Drivers.cs` | Input layer (Input System or legacy), human driver and AI driver |
| `Items.cs` | Item roll and use, Nova Orb, Stardust Mine, item boxes, boost pads |
| `Hud.cs` | Per-viewport uGUI HUD, chase camera, formatting helpers |
| `MatLib.cs` | Materials (URP or Built-in), procedural textures, primitives, synthesized audio |

Tuning lives in the fields at the top of `Kart` (`MaxSpeed`, `Accel`, `TurnRate`), `GameFlow.Laps`, and `TrackBuilder.GeneratePoints` (the track shape).
