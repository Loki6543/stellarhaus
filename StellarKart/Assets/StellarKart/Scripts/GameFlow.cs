using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.UI;

namespace StellarKart
{
    /// <summary>Spawns the game into any scene on Play, so the project needs no hand-built scene.</summary>
    public static class Boot
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Init()
        {
            if (Object.FindFirstObjectByType<GameFlow>() == null)
                new GameObject("StellarKart").AddComponent<GameFlow>();
        }
    }

    public enum Sfx { Beep, Go, Boost, Hit, Pickup, Item, Lap, Finish, Bump }

    /// <summary>Title → countdown → race → results. Owns the world, the karts, cameras and UI.</summary>
    public class GameFlow : MonoBehaviour
    {
        public static GameFlow I { get; private set; }
        public enum State { Title, Countdown, Racing, Results }
        public const int Laps = 3;

        public State Phase { get; private set; }
        public TrackPath Path { get; private set; }
        public Transform RaceRoot { get; private set; }
        public float RaceTime { get; private set; }
        public readonly List<Kart> Karts = new List<Kart>();

        readonly List<Kart> humans = new List<Kart>(), sorted = new List<Kart>();
        readonly List<Hud> huds = new List<Hud>();
        readonly Dictionary<Sfx, AudioClip> clips = new Dictionary<Sfx, AudioClip>();
        TrackBuilder.Result track;
        Camera titleCam;
        Canvas canvas;
        RectTransform overlay;
        Text overlayTitle, overlayBody, overlayFoot;
        AudioSource sfx;
        float phaseTimer, orbit, sfxCooldown;
        int lastCount, humanCount = 1;

        // Grid order, front to back. Loki is always human; Firo is human in duo, a rival in solo.
        static readonly (string name, Color body, Color accent)[] Roster =
        {
            ("Nova", new Color(1f, 0.85f, 0.25f), new Color(0.2f, 0.2f, 0.25f)),
            ("Orion", new Color(0.25f, 0.45f, 1f), new Color(0.9f, 0.9f, 1f)),
            ("Vega", new Color(0.3f, 0.85f, 0.45f), new Color(0.1f, 0.3f, 0.2f)),
            ("Lyra", new Color(0.6f, 0.35f, 0.95f), new Color(1f, 0.8f, 0.95f)),
            ("Firo", new Color(1f, 0.32f, 0.58f), new Color(1f, 0.78f, 0.3f)),
            ("Loki", new Color(1f, 0.45f, 0.12f), new Color(0.25f, 0.95f, 0.85f)),
            ("Atlas", new Color(0.85f, 0.87f, 0.92f), new Color(0.9f, 0.25f, 0.25f)),
            ("Juno", new Color(0.2f, 0.75f, 0.85f), new Color(1f, 0.5f, 0.2f)),
        };

        void Awake()
        {
            if (I != null && I != this) { Destroy(gameObject); return; }
            I = this;
            Time.fixedDeltaTime = 1f / 60f;
            CleanScene();
            SetupWorld();
            SetupAudio();
            SetupCanvas();
            ShowTitle();
        }

        void OnDestroy()
        {
            if (I == this) I = null;
        }

        static void CleanScene()
        {
            foreach (var c in FindObjectsByType<Camera>(FindObjectsSortMode.None)) Destroy(c.gameObject);
            foreach (var l in FindObjectsByType<Light>(FindObjectsSortMode.None)) Destroy(l.gameObject);
        }

        // ---------------- setup ----------------

        void SetupWorld()
        {
            var sunGo = new GameObject("Sun");
            sunGo.transform.SetParent(transform, false);
            sunGo.transform.rotation = Quaternion.Euler(24f, -55f, 0f);
            var sun = sunGo.AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.color = new Color(1f, 0.8f, 0.64f);
            sun.intensity = 1.5f;
            sun.shadows = LightShadows.Soft;
            RenderSettings.sun = sun;

            var sky = MatLib.Skybox();
            if (sky != null) RenderSettings.skybox = sky;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.55f, 0.5f, 0.78f);
            RenderSettings.ambientEquatorColor = new Color(0.52f, 0.4f, 0.5f);
            RenderSettings.ambientGroundColor = new Color(0.18f, 0.16f, 0.24f);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = 160f;
            RenderSettings.fogEndDistance = 1200f;
            RenderSettings.fogColor = new Color(0.6f, 0.45f, 0.62f);

            if (MatLib.IsURP)
            {
                var vgo = new GameObject("PostFX");
                vgo.transform.SetParent(transform, false);
                var vol = vgo.AddComponent<Volume>();
                vol.isGlobal = true;
                var profile = ScriptableObject.CreateInstance<VolumeProfile>();
                vol.sharedProfile = profile;
                var bloom = profile.Add<Bloom>(true);
                bloom.intensity.Override(0.8f);
                bloom.threshold.Override(1f);
                bloom.scatter.Override(0.65f);
                profile.Add<Tonemapping>(true).mode.Override(TonemappingMode.ACES);
                var ca = profile.Add<ColorAdjustments>(true);
                ca.postExposure.Override(0.35f);
                ca.saturation.Override(12f);
                profile.Add<Vignette>(true).intensity.Override(0.24f);
            }

            Path = new TrackPath(TrackBuilder.GeneratePoints(720), 7f);
            track = TrackBuilder.Build(Path, transform);
        }

        void SetupAudio()
        {
            sfx = gameObject.AddComponent<AudioSource>();
            sfx.spatialBlend = 0f;
            clips[Sfx.Beep] = MatLib.Tone("beep", 660f, 660f, 0.25f, 0f, 0.45f, true);
            clips[Sfx.Go] = MatLib.Tone("go", 990f, 1320f, 0.5f, 0f, 0.45f, true);
            clips[Sfx.Boost] = MatLib.Tone("boost", 200f, 900f, 0.45f, 0.45f, 0.4f);
            clips[Sfx.Hit] = MatLib.Tone("hit", 300f, 60f, 0.5f, 0.35f, 0.55f);
            clips[Sfx.Pickup] = MatLib.Tone("pickup", 880f, 1760f, 0.2f, 0f, 0.35f);
            clips[Sfx.Item] = MatLib.Tone("item", 520f, 260f, 0.2f, 0.1f, 0.35f, true);
            clips[Sfx.Lap] = MatLib.Tone("lap", 660f, 990f, 0.35f, 0f, 0.4f);
            clips[Sfx.Finish] = MatLib.Tone("finish", 520f, 1560f, 0.9f, 0f, 0.45f);
            clips[Sfx.Bump] = MatLib.Tone("bump", 140f, 80f, 0.15f, 0.5f, 0.4f);
        }

        void SetupCanvas()
        {
            var cgo = new GameObject("UI", typeof(RectTransform));
            cgo.transform.SetParent(transform, false);
            canvas = cgo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 10;
            var scaler = cgo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280f, 720f);
            scaler.matchWidthOrHeight = 0.5f;

            overlay = UI.Stretch(canvas.transform, "Overlay");
            var bg = overlay.gameObject.AddComponent<Image>();
            bg.color = new Color(0.05f, 0.03f, 0.12f, 0.55f);
            bg.raycastTarget = false;
            var mid = new Vector2(0.5f, 0.5f);
            overlayTitle = UI.Label(overlay, "Title", 92, mid, new Vector2(0f, 200f), new Vector2(1200f, 120f), TextAnchor.MiddleCenter);
            overlayBody = UI.Label(overlay, "Body", 26, mid, new Vector2(0f, -10f), new Vector2(1150f, 300f), TextAnchor.MiddleCenter);
            overlayFoot = UI.Label(overlay, "Foot", 20, mid, new Vector2(0f, -280f), new Vector2(1150f, 40f), TextAnchor.MiddleCenter);
            overlayFoot.color = new Color(0.8f, 0.78f, 0.95f);
        }

        Camera MakeCamera(string name, Transform parent, Rect rect)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var cam = go.AddComponent<Camera>();
            cam.rect = rect;
            cam.nearClipPlane = 0.1f;
            cam.farClipPlane = 2000f;
            cam.fieldOfView = 60f;
            if (RenderSettings.skybox == null)
            {
                cam.clearFlags = CameraClearFlags.SolidColor;
                cam.backgroundColor = RenderSettings.fogColor;
            }
            if (MatLib.IsURP)
            {
                var data = cam.GetUniversalAdditionalCameraData();
                data.renderPostProcessing = true;
                data.antialiasing = AntialiasingMode.SubpixelMorphologicalAntiAliasing;
            }
            return cam;
        }

        void SetTitleCam(bool on)
        {
            if (titleCam == null)
            {
                titleCam = MakeCamera("TitleCam", transform, new Rect(0f, 0f, 1f, 1f));
                titleCam.gameObject.AddComponent<AudioListener>();
            }
            titleCam.gameObject.SetActive(on);
        }

        // ---------------- flow ----------------

        void ShowTitle()
        {
            ClearRace();
            Phase = State.Title;
            SetTitleCam(true);
            overlay.gameObject.SetActive(true);
            overlayTitle.text = "<color=#FFB347>STELLAR</color> <color=#FF5FA2>KART</color>";
            overlayBody.text =
                "<size=34><b>1</b>  Solo Grand Prix — you are <color=#FF8A3D>Loki</color>\n" +
                "<b>2</b>  Split-screen — <color=#FF8A3D>Loki</color> & <color=#FF5FA2>Firo</color></size>\n\n" +
                "Solo: WASD / Arrows · Space drift · E item · R respawn\n" +
                "Loki: WASD · L-Shift drift · E item · R respawn     Firo: Arrows · R-Shift drift · Enter item · Backspace respawn\n" +
                "Gamepad: RT / A gas · LT / B brake · LB / RB drift · X item · Y respawn\n\n" +
                "Hold drift through a turn: sparks go <color=#4DD9FF>cyan</color> → <color=#C561FF>violet</color> → <color=#FFD140>gold</color>. Release to boost.";
            overlayFoot.text = "Gamepad: START = solo · SELECT = duo · Esc during a race returns here";
        }

        void StartRace(int count)
        {
            ClearRace();
            humanCount = count;
            SetTitleCam(false);
            overlay.gameObject.SetActive(false);
            RaceRoot = new GameObject("Race").transform;
            RaceRoot.SetParent(transform, false);
            track.ResetItems();

            for (int s = 0; s < Roster.Length; s++)
            {
                int row = s / 2, col = s % 2;
                int idx = Path.Wrap(-8 - row * 6 - col * 2);
                Vector3 pos = Path.pts[idx] + Path.right[idx] * (col == 0 ? -3.2f : 3.2f) + Vector3.up * 0.4f;
                var r = Roster[s];
                var k = Kart.Spawn(r.name, r.body, r.accent, pos, TrackPath.Yaw(Path.fwd[idx]), idx, Path, RaceRoot);
                k.OnLapChanged += HandleLap;
                Karts.Add(k);
            }

            var loki = Karts.Find(k => k.Name == "Loki");
            var firo = Karts.Find(k => k.Name == "Firo");
            int pads = Inp.PadCount;
            if (count == 1)
                MakeHuman(loki, 0, 0, pads > 0 ? 0 : -1, new Rect(0f, 0f, 1f, 1f));
            else
            {
                MakeHuman(loki, 0, 1, pads >= 2 ? 0 : -1, new Rect(0f, 0.5f, 1f, 0.5f));
                MakeHuman(firo, 1, 2, pads >= 2 ? 1 : pads == 1 ? 0 : -1, new Rect(0f, 0f, 1f, 0.5f));
            }
            foreach (var k in Karts)
            {
                if (k.IsHuman) continue;
                k.Driver = new AIDriver();
                k.MaxSpeed *= Random.Range(0.93f, 0.99f);
            }

            Phase = State.Countdown;
            phaseTimer = 0f;
            lastCount = 4;
            RaceTime = 0f;
            UpdatePlaces();
        }

        void MakeHuman(Kart k, int index, int scheme, int pad, Rect rect)
        {
            k.IsHuman = true;
            k.Driver = new HumanDriver(scheme, pad);
            k.ConfigureAudio(true);
            humans.Add(k);
            var cam = MakeCamera("Cam_" + k.Name, RaceRoot, rect);
            if (index == 0) cam.gameObject.AddComponent<AudioListener>();
            var chase = cam.gameObject.AddComponent<ChaseCam>();
            chase.SetTarget(k);
            k.Respawned += chase.Snap;
            huds.Add(Hud.Create(k, (RectTransform)canvas.transform, rect));
        }

        void ClearRace()
        {
            foreach (var h in huds) if (h != null) Destroy(h.gameObject);
            huds.Clear();
            humans.Clear();
            Karts.Clear();
            sorted.Clear();
            if (RaceRoot != null) Destroy(RaceRoot.gameObject);
            RaceRoot = null;
        }

        void Update()
        {
            float dt = Time.deltaTime;
            if (sfxCooldown > 0f) sfxCooldown -= dt;
            switch (Phase)
            {
                case State.Title:
                    orbit += dt * 0.05f;
                    var c = track.Center;
                    titleCam.transform.position = c + new Vector3(Mathf.Cos(orbit) * 260f, 95f, Mathf.Sin(orbit) * 220f);
                    titleCam.transform.LookAt(c + Vector3.down * 20f);
                    if (Inp.Down(K.One) || Inp.Down(K.Enter) || Inp.PadStartDown()) StartRace(1);
                    else if (Inp.Down(K.Two) || Inp.PadSelectDown()) StartRace(2);
                    break;

                case State.Countdown:
                    phaseTimer += dt;
                    int count = 3 - Mathf.FloorToInt(phaseTimer);
                    if (count != lastCount && count >= 1)
                    {
                        lastCount = count;
                        FlashAll(count.ToString(), Color.white, 0.9f);
                        PlaySfx(Sfx.Beep);
                    }
                    if (phaseTimer >= 3f)
                    {
                        Phase = State.Racing;
                        phaseTimer = 0f;
                        foreach (var k in Karts) k.ControlsLocked = false;
                        FlashAll("GO!", new Color(0.5f, 1f, 0.6f), 1.2f);
                        PlaySfx(Sfx.Go);
                    }
                    UpdatePlaces();
                    if (Inp.Down(K.Esc)) ShowTitle();
                    break;

                case State.Racing:
                    RaceTime += dt;
                    UpdatePlaces();
                    UpdateRubberBand();
                    if (humans.TrueForAll(h => h.Finished))
                    {
                        phaseTimer += dt;
                        if (phaseTimer > 3f) ShowResults();
                    }
                    if (Inp.Down(K.Esc)) ShowTitle();
                    break;

                case State.Results:
                    RaceTime += dt;
                    UpdatePlaces();
                    if (Inp.Down(K.Enter) || Inp.PadStartDown()) StartRace(humanCount);
                    else if (Inp.Down(K.One)) StartRace(1);
                    else if (Inp.Down(K.Two) || Inp.PadSelectDown()) StartRace(2);
                    else if (Inp.Down(K.Esc)) ShowTitle();
                    break;
            }
        }

        void UpdatePlaces()
        {
            sorted.Clear();
            sorted.AddRange(Karts);
            sorted.Sort((a, b) =>
            {
                if (a.Finished != b.Finished) return a.Finished ? -1 : 1;
                if (a.Finished) return a.FinishTime.CompareTo(b.FinishTime);
                return b.Progress.CompareTo(a.Progress);
            });
            for (int i = 0; i < sorted.Count; i++) sorted[i].Place = i + 1;
        }

        /// <summary>Keeps the pack close to the humans: leaders ease off, stragglers find a little extra.</summary>
        void UpdateRubberBand()
        {
            float best = float.MinValue;
            foreach (var h in humans) if (!h.Finished) best = Mathf.Max(best, h.Progress);
            foreach (var k in Karts)
            {
                if (k.IsHuman) continue;
                k.SpeedMul = best == float.MinValue ? 1f : Mathf.Clamp(1f - (k.Progress - best) / 1500f, 0.9f, 1.08f);
            }
        }

        void HandleLap(Kart k)
        {
            if (Phase != State.Racing || k.Finished) return;
            var hud = huds.Find(h => h != null && h.name == "HUD_" + k.Name);
            if (k.Lap > Laps)
            {
                k.Finished = true;
                k.FinishTime = RaceTime;
                UpdatePlaces();
                if (k.IsHuman)
                {
                    k.Driver = new AIDriver();
                    hud?.Flash(Fmt.Ordinal(k.Place) + " PLACE!", new Color(1f, 0.84f, 0.3f), 4f);
                    PlaySfx(Sfx.Finish);
                }
            }
            else if (k.IsHuman && k.Lap == Laps)
            {
                hud?.Flash("FINAL LAP!", new Color(1f, 0.5f, 0.6f), 2f);
                PlaySfx(Sfx.Lap);
            }
            else if (k.IsHuman && k.Lap > 1)
            {
                hud?.Flash("LAP " + k.Lap, Color.white, 1.5f);
                PlaySfx(Sfx.Lap);
            }
        }

        void ShowResults()
        {
            Phase = State.Results;
            UpdatePlaces();
            var sb = new StringBuilder();
            foreach (var k in sorted)
            {
                float t = k.Finished ? k.FinishTime : RaceTime + ((Laps + 1) * (float)Path.Count - k.Progress) * Path.SampleLength / 26f;
                string name = k.IsHuman ? "<color=" + Fmt.Hex(k.Color) + "><b>" + k.Name + "</b></color>" : k.Name;
                sb.Append(Fmt.Ordinal(k.Place)).Append("   ").Append(name).Append("   ").Append(Fmt.Time(t)).Append(k.Finished ? "" : " *").Append('\n');
            }
            var winner = sorted.Count > 0 ? sorted[0] : null;
            overlayTitle.text = winner != null && winner.IsHuman
                ? "<color=" + Fmt.Hex(winner.Color) + ">" + winner.Name.ToUpper() + "</color> WINS!"
                : "RACE COMPLETE";
            overlayBody.text = "<size=30>" + sb + "</size>";
            overlayFoot.text = "Enter — race again · 1 solo · 2 duo · Esc title        * projected time";
            overlay.gameObject.SetActive(true);
        }

        // ---------------- helpers ----------------

        void FlashAll(string text, Color c, float dur)
        {
            foreach (var h in huds) if (h != null) h.Flash(text, c, dur);
        }

        public void PlaySfx(Sfx s, Kart k = null)
        {
            if (k != null && !k.IsHuman) return;
            if (s == Sfx.Bump && sfxCooldown > 0f) return;
            if (s == Sfx.Bump) sfxCooldown = 0.25f;
            if (clips.TryGetValue(s, out var clip)) sfx.PlayOneShot(clip, 0.8f);
        }

        public Kart KartAhead(Kart k)
        {
            foreach (var o in Karts) if (o.Place == k.Place - 1) return o;
            return null;
        }
    }
}
