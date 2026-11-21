using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace StellarKart
{
    public struct KartCommand
    {
        public float throttle, steer;
        public bool drift, useItem;
    }

    public interface IKartDriver
    {
        KartCommand Read(Kart k, float dt);
    }

    public enum K { W, A, S, D, Up, Down, Left, Right, Space, LShift, RShift, E, Q, LCtrl, RCtrl, Enter, One, Two, R, Esc, Backspace }

    public struct PadState
    {
        public bool valid, drift, item, respawn;
        public float steer, throttle, brake;
    }

    /// <summary>Thin input layer: new Input System when enabled, legacy Input Manager otherwise.</summary>
    public static class Inp
    {
#if ENABLE_INPUT_SYSTEM
        static Key Map(K k)
        {
            switch (k)
            {
                case K.W: return Key.W;
                case K.A: return Key.A;
                case K.S: return Key.S;
                case K.D: return Key.D;
                case K.Up: return Key.UpArrow;
                case K.Down: return Key.DownArrow;
                case K.Left: return Key.LeftArrow;
                case K.Right: return Key.RightArrow;
                case K.Space: return Key.Space;
                case K.LShift: return Key.LeftShift;
                case K.RShift: return Key.RightShift;
                case K.E: return Key.E;
                case K.Q: return Key.Q;
                case K.LCtrl: return Key.LeftCtrl;
                case K.RCtrl: return Key.RightCtrl;
                case K.Enter: return Key.Enter;
                case K.One: return Key.Digit1;
                case K.Two: return Key.Digit2;
                case K.R: return Key.R;
                case K.Esc: return Key.Escape;
                default: return Key.Backspace;
            }
        }

        public static bool Held(K k) { var kb = Keyboard.current; return kb != null && kb[Map(k)].isPressed; }
        public static bool Down(K k) { var kb = Keyboard.current; return kb != null && kb[Map(k)].wasPressedThisFrame; }
        public static int PadCount => Gamepad.all.Count;

        public static PadState Pad(int i)
        {
            var all = Gamepad.all;
            if (i < 0 || i >= all.Count) return default;
            var g = all[i];
            float x = g.leftStick.x.ReadValue();
            if (Mathf.Abs(x) < 0.15f) x = 0f;
            x += g.dpad.x.ReadValue();
            return new PadState
            {
                valid = true,
                steer = Mathf.Clamp(x, -1f, 1f),
                throttle = Mathf.Max(g.rightTrigger.ReadValue(), g.buttonSouth.isPressed ? 1f : 0f),
                brake = Mathf.Max(g.leftTrigger.ReadValue(), g.buttonEast.isPressed ? 1f : 0f),
                drift = g.rightShoulder.isPressed || g.leftShoulder.isPressed,
                item = g.buttonWest.isPressed,
                respawn = g.buttonNorth.isPressed
            };
        }

        public static bool PadStartDown()
        {
            foreach (var g in Gamepad.all) if (g.startButton.wasPressedThisFrame) return true;
            return false;
        }

        public static bool PadSelectDown()
        {
            foreach (var g in Gamepad.all) if (g.selectButton.wasPressedThisFrame) return true;
            return false;
        }
#else
        static KeyCode Map(K k)
        {
            switch (k)
            {
                case K.W: return KeyCode.W;
                case K.A: return KeyCode.A;
                case K.S: return KeyCode.S;
                case K.D: return KeyCode.D;
                case K.Up: return KeyCode.UpArrow;
                case K.Down: return KeyCode.DownArrow;
                case K.Left: return KeyCode.LeftArrow;
                case K.Right: return KeyCode.RightArrow;
                case K.Space: return KeyCode.Space;
                case K.LShift: return KeyCode.LeftShift;
                case K.RShift: return KeyCode.RightShift;
                case K.E: return KeyCode.E;
                case K.Q: return KeyCode.Q;
                case K.LCtrl: return KeyCode.LeftControl;
                case K.RCtrl: return KeyCode.RightControl;
                case K.Enter: return KeyCode.Return;
                case K.One: return KeyCode.Alpha1;
                case K.Two: return KeyCode.Alpha2;
                case K.R: return KeyCode.R;
                case K.Esc: return KeyCode.Escape;
                default: return KeyCode.Backspace;
            }
        }

        public static bool Held(K k) => Input.GetKey(Map(k));
        public static bool Down(K k) => Input.GetKeyDown(Map(k));
        public static int PadCount => 0;
        public static PadState Pad(int i) => default;
        public static bool PadStartDown() => false;
        public static bool PadSelectDown() => false;
#endif
    }

    /// <summary>
    /// scheme 0 = solo (WASD + arrows), 1 = Loki in duo (WASD), 2 = Firo in duo (arrows).
    /// </summary>
    public class HumanDriver : IKartDriver
    {
        readonly int scheme, pad;
        bool prevItem, prevRespawn;

        public HumanDriver(int scheme, int pad)
        {
            this.scheme = scheme;
            this.pad = pad;
        }

        public KartCommand Read(Kart k, float dt)
        {
            bool up = false, down = false, left = false, right = false, drift, item, respawn;
            if (scheme != 2) { up |= Inp.Held(K.W); down |= Inp.Held(K.S); left |= Inp.Held(K.A); right |= Inp.Held(K.D); }
            if (scheme != 1) { up |= Inp.Held(K.Up); down |= Inp.Held(K.Down); left |= Inp.Held(K.Left); right |= Inp.Held(K.Right); }

            if (scheme == 0)
            {
                drift = Inp.Held(K.Space) || Inp.Held(K.LShift) || Inp.Held(K.RShift);
                item = Inp.Held(K.E) || Inp.Held(K.Q) || Inp.Held(K.LCtrl) || Inp.Held(K.Enter);
                respawn = Inp.Held(K.R);
            }
            else if (scheme == 1)
            {
                drift = Inp.Held(K.LShift) || Inp.Held(K.Space);
                item = Inp.Held(K.E) || Inp.Held(K.Q);
                respawn = Inp.Held(K.R);
            }
            else
            {
                drift = Inp.Held(K.RShift);
                item = Inp.Held(K.Enter) || Inp.Held(K.RCtrl);
                respawn = Inp.Held(K.Backspace);
            }

            float steer = (right ? 1f : 0f) - (left ? 1f : 0f);
            float thr = (up ? 1f : 0f) - (down ? 1f : 0f);
            var p = Inp.Pad(pad);
            if (p.valid)
            {
                if (Mathf.Abs(p.steer) > Mathf.Abs(steer)) steer = p.steer;
                float pt = p.throttle - p.brake;
                if (Mathf.Abs(pt) > Mathf.Abs(thr)) thr = pt;
                drift |= p.drift;
                item |= p.item;
                respawn |= p.respawn;
            }

            var cmd = new KartCommand { throttle = thr, steer = steer, drift = drift, useItem = item && !prevItem };
            prevItem = item;
            if (respawn && !prevRespawn) k.Respawn();
            prevRespawn = respawn;
            return cmd;
        }
    }

    /// <summary>Racing-line follower with lane wandering, drift on long bends, item timing and stuck recovery.</summary>
    public class AIDriver : IKartDriver
    {
        float lane, laneTarget, laneTimer, itemTimer = -1f, stuck, reverseTimer;
        int stuckCount;
        bool drifting;
        readonly float aggression;

        public AIDriver()
        {
            lane = laneTarget = Random.Range(-3f, 3f);
            aggression = Random.Range(0.8f, 1.25f);
        }

        static Vector3 Flat(Vector3 v) => new Vector3(v.x, 0f, v.z);

        public KartCommand Read(Kart k, float dt)
        {
            var p = k.Path;
            var cmd = new KartCommand();

            laneTimer -= dt;
            if (laneTimer <= 0f)
            {
                laneTimer = Random.Range(2f, 5f);
                laneTarget = Random.Range(-p.HalfWidth * 0.55f, p.HalfWidth * 0.55f);
            }
            lane = Mathf.MoveTowards(lane, laneTarget, 1.5f * dt);

            float spd = Mathf.Max(k.Speed, 0f);
            int look = 7 + Mathf.RoundToInt(spd * 0.55f);
            int ti = p.Wrap(k.PathIndex + look);
            Vector3 to = Flat(p.pts[ti] + p.right[ti] * lane - k.transform.position);
            float ang = Vector3.SignedAngle(k.Forward, to, Vector3.up);
            int far = p.Wrap(k.PathIndex + look + 30);
            float bend = Vector3.SignedAngle(Flat(p.fwd[k.PathIndex]), Flat(p.fwd[far]), Vector3.up);
            float absBend = Mathf.Abs(bend);

            cmd.steer = Mathf.Clamp(ang / 22f, -1f, 1f);
            cmd.throttle = absBend > 70f && spd > k.MaxSpeed * 0.8f ? 0.4f : 1f;

            if (!drifting && absBend > 40f && spd > 18f && Mathf.Sign(bend) == Mathf.Sign(ang) && Mathf.Abs(ang) > 8f) drifting = true;
            if (drifting && (absBend < 18f || (k.DriftTier >= 3 && absBend < 30f))) drifting = false;
            cmd.drift = drifting;

            if (reverseTimer > 0f)
            {
                reverseTimer -= dt;
                cmd.throttle = -1f;
                cmd.steer = -cmd.steer;
                cmd.drift = drifting = false;
                return cmd;
            }
            if (!k.SpunOut && Mathf.Abs(k.Speed) < 2.5f) stuck += dt; else stuck = 0f;
            if (spd > 10f) stuckCount = 0;
            if (stuck > 1.5f)
            {
                stuck = 0f;
                if (++stuckCount > 2) { k.Respawn(); stuckCount = 0; }
                else reverseTimer = 0.9f;
            }

            if (k.HeldItem != ItemType.None && !k.Rolling)
            {
                if (itemTimer < 0f) itemTimer = Random.Range(0.6f, 3.5f) / aggression;
                itemTimer -= dt;
                bool comet = k.HeldItem == ItemType.Comet || k.HeldItem == ItemType.CometTrio;
                if (itemTimer <= 0f && (!comet || absBend < 25f))
                {
                    cmd.useItem = true;
                    itemTimer = k.ItemCount > 1 ? 0.8f : -1f;
                }
            }
            else itemTimer = -1f;

            return cmd;
        }
    }
}
