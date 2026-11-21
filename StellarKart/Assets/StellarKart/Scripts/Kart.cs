using System;
using UnityEngine;

namespace StellarKart
{
    /// <summary>
    /// Arcade kart: rigidbody for collisions, but speed, heading and grip are driven directly
    /// so handling stays tight and predictable. Hold drift while steering to charge a
    /// three-tier mini-boost (cyan → violet → gold).
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public class Kart : MonoBehaviour
    {
        public string Name;
        public Color Color;
        public bool IsHuman;
        public IKartDriver Driver;
        public TrackPath Path;

        public float MaxSpeed = 30f, Accel = 17f, TurnRate = 110f, SpeedMul = 1f;

        public float Speed { get; private set; }
        public float Heading { get; private set; }
        public bool Grounded { get; private set; }
        public bool Offroad { get; private set; }
        public bool WrongWay { get; private set; }

        public int PathIndex, Lap, Place = 1;
        public bool Finished, ControlsLocked = true;
        public float FinishTime;

        public ItemType HeldItem;
        public int ItemCount;
        float rouletteTimer;
        public bool Rolling => rouletteTimer > 0f;

        public bool Boosting => boostTimer > 0f;
        public bool Drifting => drifting;
        public int DriftTier => driftTier;
        public float DriftCharge => driftCharge;
        public bool Shielded => shieldTimer > 0f;
        public bool SpunOut => spinTimer > 0f;
        public Vector3 Forward => Quaternion.Euler(0f, Heading, 0f) * Vector3.forward;
        public float Progress => Lap * (float)Path.Count + PathIndex;

        public event Action<Kart> OnLapChanged;
        public event Action Respawned;

        public static readonly Color[] TierColors =
        {
            new Color(1f, 1f, 1f), new Color(0.3f, 0.85f, 1f), new Color(0.78f, 0.38f, 1f), new Color(1f, 0.82f, 0.25f)
        };

        Rigidbody rb;
        Transform model;
        readonly Transform[] wheels = new Transform[4];
        ParticleSystem sparkL, sparkR, boostFx;
        GameObject shieldFx;
        AudioSource engine;
        Quaternion tilt = Quaternion.identity;
        Vector3 groundNormal = Vector3.up, knock;
        float boostTimer, boostPower = 1f, spinTimer, spinAngle, shieldTimer, invulnTimer;
        float wheelSpin, visSteer, lastSteer, driftVisual, wrongTimer;
        bool drifting;
        int driftDir, driftTier;
        float driftCharge;

        // ---------------- construction ----------------

        public static Kart Spawn(string name, Color body, Color accent, Vector3 pos, float heading, int pathIndex, TrackPath path, Transform parent)
        {
            var go = new GameObject("Kart_" + name);
            go.transform.SetParent(parent, false);
            go.transform.SetPositionAndRotation(pos, Quaternion.Euler(0f, heading, 0f));
            var k = go.AddComponent<Kart>();
            k.Name = name;
            k.Color = body;
            k.Path = path;
            k.Heading = heading;
            k.PathIndex = pathIndex;
            k.Build(accent);
            return k;
        }

        void Build(Color accent)
        {
            rb = GetComponent<Rigidbody>();
            rb.mass = 180f;
            rb.interpolation = RigidbodyInterpolation.Interpolate;
            rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            rb.constraints = RigidbodyConstraints.FreezeRotation;
            rb.linearDamping = 0f;
            rb.angularDamping = 0f;

            var col = gameObject.AddComponent<BoxCollider>();
            col.center = new Vector3(0f, 0.5f, 0f);
            col.size = new Vector3(1.35f, 0.7f, 2.0f);
            col.sharedMaterial = new PhysicsMaterial("Kart")
            {
                dynamicFriction = 0f, staticFriction = 0f, bounciness = 0f,
                frictionCombine = PhysicsMaterialCombine.Minimum, bounceCombine = PhysicsMaterialCombine.Minimum
            };

            model = new GameObject("Model").transform;
            model.SetParent(transform, false);
            model.localPosition = new Vector3(0f, -0.15f, 0f);
            tilt = transform.rotation;

            var bodyM = MatLib.Lit(Color, 0.75f, 0.35f);
            var accentM = MatLib.Lit(accent, 0.6f, 0.2f);
            var dark = MatLib.Lit(new Color(0.08f, 0.08f, 0.1f), 0.35f);
            var visor = MatLib.Lit(new Color(0.05f, 0.05f, 0.08f), 0.95f, 0.6f);

            MatLib.Prim(PrimitiveType.Cube, model, new Vector3(0f, 0.45f, 0f), new Vector3(1.3f, 0.35f, 1.9f), bodyM);
            MatLib.Prim(PrimitiveType.Cube, model, new Vector3(0f, 0.4f, 1.15f), new Vector3(1.0f, 0.22f, 0.55f), accentM);
            MatLib.Prim(PrimitiveType.Cube, model, new Vector3(0f, 0.62f, 0.55f), new Vector3(0.7f, 0.12f, 0.6f), bodyM);
            MatLib.Prim(PrimitiveType.Cube, model, new Vector3(0f, 0.85f, -0.6f), new Vector3(0.9f, 0.5f, 0.15f), dark);
            MatLib.Prim(PrimitiveType.Capsule, model, new Vector3(0f, 0.85f, -0.25f), new Vector3(0.55f, 0.35f, 0.5f), accentM);
            MatLib.Prim(PrimitiveType.Sphere, model, new Vector3(0f, 1.32f, -0.2f), Vector3.one * 0.5f, bodyM);
            MatLib.Prim(PrimitiveType.Cube, model, new Vector3(0f, 1.33f, 0.04f), new Vector3(0.36f, 0.15f, 0.1f), visor);
            MatLib.Prim(PrimitiveType.Cube, model, new Vector3(0f, 1.05f, -0.98f), new Vector3(1.45f, 0.08f, 0.4f), accentM);
            MatLib.Prim(PrimitiveType.Cube, model, new Vector3(0.5f, 0.8f, -0.98f), new Vector3(0.08f, 0.45f, 0.08f), dark);
            MatLib.Prim(PrimitiveType.Cube, model, new Vector3(-0.5f, 0.8f, -0.98f), new Vector3(0.08f, 0.45f, 0.08f), dark);
            MatLib.Prim(PrimitiveType.Cylinder, model, new Vector3(0.45f, 1.25f, -0.7f), new Vector3(0.04f, 0.4f, 0.04f), dark);
            MatLib.Prim(PrimitiveType.Sphere, model, new Vector3(0.45f, 1.68f, -0.7f), Vector3.one * 0.24f, MatLib.Emissive(accent, 3f));

            Vector3[] wp = { new Vector3(-0.72f, 0.3f, 0.7f), new Vector3(0.72f, 0.3f, 0.7f), new Vector3(-0.72f, 0.3f, -0.7f), new Vector3(0.72f, 0.3f, -0.7f) };
            for (int i = 0; i < 4; i++)
            {
                wheels[i] = new GameObject("Wheel").transform;
                wheels[i].SetParent(model, false);
                wheels[i].localPosition = wp[i];
                var tyre = MatLib.Prim(PrimitiveType.Cylinder, wheels[i], Vector3.zero, new Vector3(0.6f, 0.15f, 0.6f), dark);
                tyre.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
                var hub = MatLib.Prim(PrimitiveType.Cylinder, wheels[i], Vector3.zero, new Vector3(0.3f, 0.16f, 0.3f), accentM);
                hub.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
            }

            var back = Quaternion.Euler(-25f, 180f, 0f);
            sparkL = MatLib.Particles(model, new Vector3(-0.65f, 0.12f, -0.85f), back, Color.white, 70f, 5f, 0.2f, 0.3f);
            sparkR = MatLib.Particles(model, new Vector3(0.65f, 0.12f, -0.85f), back, Color.white, 70f, 5f, 0.2f, 0.3f);
            boostFx = MatLib.Particles(model, new Vector3(0f, 0.5f, -1.1f), Quaternion.Euler(0f, 180f, 0f), new Color(1f, 0.6f, 0.25f), 90f, 7f, 0.45f, 0.35f);

            shieldFx = MatLib.Prim(PrimitiveType.Sphere, model, new Vector3(0f, 0.75f, 0f), Vector3.one * 2.8f,
                MatLib.Transparent(new Color(0.4f, 0.85f, 1f, 0.22f), new Color(0.2f, 0.6f, 1f) * 1.5f));
            shieldFx.SetActive(false);

            engine = gameObject.AddComponent<AudioSource>();
            engine.clip = EngineClip;
            engine.loop = true;
            engine.playOnAwake = false;
            ConfigureAudio(false);
            engine.Play();
        }

        static AudioClip engineClip;
        static AudioClip EngineClip => engineClip != null ? engineClip : (engineClip = MatLib.EngineClip());

        public void ConfigureAudio(bool human)
        {
            engine.spatialBlend = human ? 0f : 1f;
            engine.volume = human ? 0.16f : 0.4f;
            engine.rolloffMode = AudioRolloffMode.Linear;
            engine.minDistance = 4f;
            engine.maxDistance = 55f;
            engine.dopplerLevel = 0.4f;
        }

        // ---------------- simulation ----------------

        void FixedUpdate()
        {
            float dt = Time.fixedDeltaTime;
            var cmd = (!ControlsLocked && Driver != null) ? Driver.Read(this, dt) : default;
            if (spinTimer > 0f) { spinTimer -= dt; cmd = default; }
            lastSteer = cmd.steer;
            if (invulnTimer > 0f) invulnTimer -= dt;
            if (shieldTimer > 0f) { shieldTimer -= dt; if (shieldTimer <= 0f) shieldFx.SetActive(false); }
            if (rouletteTimer > 0f) { rouletteTimer -= dt; if (rouletteTimer <= 0f) FinishRoulette(); }

            Vector3 pos = rb.position;
            Vector3 fwd = Forward;

            // Walls and karts that block us bleed off speed.
            float actualFwd = Vector3.Dot(rb.linearVelocity, fwd);
            if (Speed > 0f && actualFwd < Speed - 8f) Speed = Mathf.Lerp(Speed, Mathf.Max(actualFwd, 0f), 0.3f);

            Grounded = Physics.Raycast(pos + Vector3.up * 0.6f, Vector3.down, out RaycastHit hit, 1.0f, ~0, QueryTriggerInteraction.Ignore);
            groundNormal = Grounded ? hit.normal : Vector3.Lerp(groundNormal, Vector3.up, 2f * dt);

            UpdateProgress(pos, fwd, dt);

            // ---- speed ----
            float top = MaxSpeed * SpeedMul * (Offroad ? 0.5f : 1f);
            if (boostTimer > 0f)
            {
                boostTimer -= dt;
                Speed = Mathf.MoveTowards(Speed, MaxSpeed * boostPower * SpeedMul, 70f * dt);
            }
            else
            {
                float a = Grounded ? 1f : 0.3f;
                if (cmd.throttle > 0.05f)
                {
                    float tgt = top * cmd.throttle;
                    float rate = Speed > tgt ? 20f : Accel * (Speed < 0f ? 2.5f : 1f - 0.5f * Mathf.Clamp01(Speed / MaxSpeed));
                    Speed = Mathf.MoveTowards(Speed, tgt, rate * a * dt);
                }
                else if (cmd.throttle < -0.05f)
                    Speed = Mathf.MoveTowards(Speed, -10f * -cmd.throttle, (Speed > 0f ? 35f : 10f) * a * dt);
                else
                    Speed = Mathf.MoveTowards(Speed, 0f, 7f * dt);
            }
            if (spinTimer > 0f) Speed = Mathf.MoveTowards(Speed, 0f, 25f * dt);

            // ---- steering & drift ----
            float yawDelta = 0f;
            if (!drifting && cmd.drift && Grounded && Speed > 11f && Mathf.Abs(cmd.steer) > 0.35f)
            {
                drifting = true;
                driftDir = cmd.steer > 0f ? 1 : -1;
                driftCharge = 0f;
                driftTier = 0;
                rb.linearVelocity += Vector3.up * 3.2f; // hop
            }
            if (drifting)
            {
                if (!cmd.drift || Speed < 7f) EndDrift(true);
                else
                {
                    float s = Mathf.Lerp(0.35f, 1.3f, (cmd.steer * driftDir + 1f) * 0.5f);
                    yawDelta = driftDir * s * TurnRate * 0.95f * dt;
                    if (Grounded) driftCharge += dt * (cmd.steer * driftDir > 0.3f ? 1.3f : 0.9f);
                    driftTier = driftCharge > 2.8f ? 3 : driftCharge > 1.7f ? 2 : driftCharge > 0.8f ? 1 : 0;
                }
            }
            if (!drifting)
            {
                float lowSpeed = Mathf.Clamp01(Mathf.Abs(Speed) / 6f);
                float highSpeed = 1f - 0.35f * Mathf.Clamp01(Speed / MaxSpeed);
                yawDelta = cmd.steer * TurnRate * lowSpeed * highSpeed * (Speed < -0.1f ? -1f : 1f) * dt;
            }
            if (!Grounded) yawDelta *= 0.5f;
            Heading = Mathf.Repeat(Heading + yawDelta, 360f);
            rb.MoveRotation(Quaternion.Euler(0f, Heading, 0f));
            fwd = Forward;

            // ---- velocity ----
            Vector3 moveDir = Grounded ? Vector3.ProjectOnPlane(fwd, groundNormal).normalized : fwd;
            Vector3 v = rb.linearVelocity;
            Vector3 target = moveDir * Speed + knock;
            if (drifting) target += Vector3.Cross(Vector3.up, fwd) * (-driftDir) * Speed * 0.12f;
            float grip = Grounded ? (drifting ? 5f : 14f) : 0.8f;
            Vector3 nv = Vector3.Lerp(v, target, 1f - Mathf.Exp(-grip * dt));
            if (!Grounded || v.y > target.y + 0.5f) nv.y = v.y;
            rb.linearVelocity = nv;
            rb.AddForce(Grounded ? -groundNormal * 25f : Vector3.down * 18f, ForceMode.Acceleration);
            knock = Vector3.MoveTowards(knock, Vector3.zero, 20f * dt);

            if (cmd.useItem && HeldItem != ItemType.None && !Rolling) UseItem();
            if (pos.y < TrackBuilder.GroundY + 1.5f) Respawn();
        }

        void UpdateProgress(Vector3 pos, Vector3 fwd, float dt)
        {
            int n = Path.Count;
            int ni = Path.Nearest(pos, PathIndex, 25);
            if (PathIndex > n * 3 / 4 && ni < n / 4) { Lap++; OnLapChanged?.Invoke(this); }
            else if (PathIndex < n / 4 && ni > n * 3 / 4) Lap--;
            PathIndex = ni;
            Offroad = Mathf.Abs(Path.Lateral(pos, ni)) > Path.HalfWidth + TrackBuilder.Curb + 0.1f;

            if (Vector3.Dot(fwd, Path.fwd[ni]) < -0.2f && Speed > 4f) wrongTimer += dt; else wrongTimer = 0f;
            WrongWay = wrongTimer > 1f;
        }

        void EndDrift(bool reward)
        {
            if (reward && driftTier > 0)
            {
                float[] power = { 1f, 1.22f, 1.3f, 1.4f }, dur = { 0f, 0.6f, 1.0f, 1.5f };
                Boost(power[driftTier], dur[driftTier]);
            }
            drifting = false;
            driftTier = 0;
            driftCharge = 0f;
        }

        // ---------------- gameplay hooks ----------------

        public void Boost(float power, float duration)
        {
            boostPower = boostTimer > 0f ? Mathf.Max(boostPower, power) : power;
            boostTimer = Mathf.Max(boostTimer, duration);
            GameFlow.I?.PlaySfx(Sfx.Boost, this);
        }

        public void Shield(float duration)
        {
            shieldTimer = duration;
            shieldFx.SetActive(true);
        }

        /// <summary>Returns true if the hit landed (no shield / invulnerability).</summary>
        public bool Hit()
        {
            if (invulnTimer > 0f) return false;
            if (Shielded)
            {
                shieldTimer = 0f;
                shieldFx.SetActive(false);
                invulnTimer = 0.6f;
                GameFlow.I?.PlaySfx(Sfx.Bump, this);
                return false;
            }
            spinTimer = 1.1f;
            invulnTimer = 2f;
            Speed *= 0.25f;
            boostTimer = 0f;
            EndDrift(false);
            GameFlow.I?.PlaySfx(Sfx.Hit, this);
            return true;
        }

        public bool TryStartRoulette()
        {
            if (HeldItem != ItemType.None || Rolling) return false;
            rouletteTimer = 1.0f;
            GameFlow.I?.PlaySfx(Sfx.Pickup, this);
            return true;
        }

        void FinishRoulette()
        {
            int total = GameFlow.I != null ? GameFlow.I.Karts.Count : 8;
            HeldItem = Items.Roll(Place, total);
            ItemCount = HeldItem == ItemType.CometTrio ? 3 : 1;
        }

        void UseItem()
        {
            var t = HeldItem;
            if (--ItemCount <= 0) { HeldItem = ItemType.None; ItemCount = 0; }
            Items.Use(this, t);
            GameFlow.I?.PlaySfx(Sfx.Item, this);
        }

        public void Respawn()
        {
            int i = Path.Nearest(rb.position, PathIndex, 40);
            PlaceAt(Path.pts[i] + Vector3.up * 0.6f, TrackPath.Yaw(Path.fwd[i]), i);
            invulnTimer = 1.5f;
        }

        public void PlaceAt(Vector3 pos, float heading, int pathIndex)
        {
            Heading = heading;
            PathIndex = pathIndex;
            rb.position = pos;
            rb.rotation = Quaternion.Euler(0f, heading, 0f);
            transform.SetPositionAndRotation(pos, rb.rotation);
            rb.linearVelocity = Vector3.zero;
            Speed = 0f;
            knock = Vector3.zero;
            spinTimer = 0f;
            EndDrift(false);
            Respawned?.Invoke();
        }

        void OnCollisionEnter(Collision c)
        {
            var other = c.rigidbody != null ? c.rigidbody.GetComponent<Kart>() : null;
            if (other == null) return;
            Vector3 d = transform.position - other.transform.position;
            d.y = 0f;
            if (d.sqrMagnitude < 0.0001f) d = Vector3.right;
            knock += d.normalized * (other.Boosting && !Boosting ? 10f : 5f);
            GameFlow.I?.PlaySfx(Sfx.Bump, this);
        }

        // ---------------- visuals ----------------

        void Update()
        {
            float dt = Time.deltaTime;
            spinAngle = spinTimer > 0f ? spinAngle + 900f * dt : Mathf.LerpAngle(spinAngle, 0f, 1f - Mathf.Exp(-12f * dt));
            driftVisual = Mathf.Lerp(driftVisual, drifting ? driftDir * 22f : 0f, 1f - Mathf.Exp(-10f * dt));

            Vector3 f = Vector3.ProjectOnPlane(Forward, groundNormal);
            if (f.sqrMagnitude > 0.001f)
                tilt = Quaternion.Slerp(tilt, Quaternion.LookRotation(f.normalized, groundNormal), 1f - Mathf.Exp(-12f * dt));
            model.rotation = tilt * Quaternion.Euler(0f, driftVisual + spinAngle, 0f);

            wheelSpin = Mathf.Repeat(wheelSpin + Speed * dt / 0.3f * Mathf.Rad2Deg, 360f);
            visSteer = Mathf.Lerp(visSteer, lastSteer * 25f, 1f - Mathf.Exp(-12f * dt));
            for (int i = 0; i < 4; i++)
                wheels[i].localRotation = (i < 2 ? Quaternion.Euler(0f, visSteer, 0f) : Quaternion.identity) * Quaternion.Euler(wheelSpin, 0f, 0f);

            bool sparks = drifting && Grounded;
            SetEmit(sparkL, sparks, TierColors[driftTier]);
            SetEmit(sparkR, sparks, TierColors[driftTier]);
            SetEmit(boostFx, Boosting, boostPower > 1.35f ? new Color(1f, 0.75f, 0.3f) : new Color(0.4f, 0.85f, 1f));
            if (shieldFx.activeSelf) shieldFx.transform.Rotate(0f, 90f * dt, 0f);

            engine.pitch = 0.55f + Mathf.Abs(Speed) / MaxSpeed * 1.1f + (Boosting ? 0.25f : 0f);
        }

        static void SetEmit(ParticleSystem ps, bool on, Color c)
        {
            var e = ps.emission;
            e.enabled = on;
            var m = ps.main;
            m.startColor = c * 2f;
        }
    }
}
