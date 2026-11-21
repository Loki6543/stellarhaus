using UnityEngine;
using UnityEngine.Rendering;

namespace StellarKart
{
    /// <summary>
    /// Runtime factory for materials, procedural textures, primitives and synthesized audio.
    /// Prefers material templates in Resources (created by the editor setup so builds keep their shaders),
    /// then the active pipeline's defaults, then shader lookups. Works under URP or Built-in.
    /// </summary>
    public static class MatLib
    {
        static Material litT, emissiveT, transparentT, particleT;
        static Texture2D softDot;
        static Font font;

        public static bool IsURP => GraphicsSettings.currentRenderPipeline != null;

        public static Font UIFont
        {
            get
            {
                if (font == null) font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                return font;
            }
        }

        static Material FallbackLit()
        {
            Shader sh = IsURP ? Shader.Find("Universal Render Pipeline/Lit") : null;
            if (sh == null) sh = Shader.Find("Standard");
            return new Material(sh);
        }

        static Material Template(ref Material slot, string resource)
        {
            if (slot != null) return slot;
            slot = IsURP ? Resources.Load<Material>(resource) : null;
            if (slot == null) slot = FallbackLit();
            return slot;
        }

        static void SetBase(Material m, Color c)
        {
            m.color = c;
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
        }

        static void SetSurface(Material m, float smooth, float metal)
        {
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smooth);
            if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", smooth);
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", metal);
        }

        public static Material Lit(Color c, float smooth = 0.3f, float metal = 0f)
        {
            var m = new Material(Template(ref litT, "SK_Lit"));
            SetBase(m, c);
            SetSurface(m, smooth, metal);
            return m;
        }

        public static void ConfigureEmission(Material m, Color emission)
        {
            m.EnableKeyword("_EMISSION");
            if (m.HasProperty("_EmissionColor")) m.SetColor("_EmissionColor", emission);
            m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.None;
        }

        /// <summary>Glowing material. Intensity above ~1 feeds the bloom pass.</summary>
        public static Material Emissive(Color c, float intensity)
        {
            var m = new Material(Template(ref emissiveT, "SK_LitEmissive"));
            SetBase(m, new Color(c.r * 0.4f, c.g * 0.4f, c.b * 0.4f, 1f));
            SetSurface(m, 0.6f, 0f);
            ConfigureEmission(m, c * intensity);
            return m;
        }

        public static Material Textured(Texture2D tex, Color tint, float smooth = 0.2f)
        {
            var m = Lit(tint, smooth);
            m.mainTexture = tex;
            if (m.HasProperty("_BaseMap")) m.SetTexture("_BaseMap", tex);
            return m;
        }

        public static Material EmissiveTextured(Texture2D tex, Color c, float intensity)
        {
            var m = Emissive(c, intensity);
            m.mainTexture = tex;
            if (m.HasProperty("_BaseMap")) m.SetTexture("_BaseMap", tex);
            if (m.HasProperty("_EmissionMap")) m.SetTexture("_EmissionMap", tex);
            return m;
        }

        public static void ConfigureTransparent(Material m)
        {
            if (m.HasProperty("_Surface")) m.SetFloat("_Surface", 1f);
            if (m.HasProperty("_Blend")) m.SetFloat("_Blend", 0f);
            if (m.HasProperty("_Mode")) m.SetFloat("_Mode", 3f);
            m.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha);
            m.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
            if (m.HasProperty("_SrcBlendAlpha")) m.SetInt("_SrcBlendAlpha", (int)BlendMode.One);
            if (m.HasProperty("_DstBlendAlpha")) m.SetInt("_DstBlendAlpha", (int)BlendMode.OneMinusSrcAlpha);
            m.SetInt("_ZWrite", 0);
            m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            m.EnableKeyword("_ALPHABLEND_ON");
            m.SetShaderPassEnabled("ShadowCaster", false);
            m.SetShaderPassEnabled("DepthOnly", false);
            m.renderQueue = (int)RenderQueue.Transparent;
        }

        public static Material Transparent(Color c, Color emission)
        {
            var m = new Material(Template(ref transparentT, "SK_LitTransparent"));
            ConfigureTransparent(m);
            SetBase(m, c);
            SetSurface(m, 0.8f, 0f);
            if (emission.maxColorComponent > 0f) ConfigureEmission(m, emission);
            return m;
        }

        public static void ConfigureParticle(Material m)
        {
            if (m.HasProperty("_Surface")) m.SetFloat("_Surface", 1f);
            if (m.HasProperty("_Blend")) m.SetFloat("_Blend", 2f); // additive
            m.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha);
            m.SetInt("_DstBlend", (int)BlendMode.One);
            m.SetInt("_ZWrite", 0);
            m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            m.renderQueue = (int)RenderQueue.Transparent;
        }

        public static Material Particle(Color c)
        {
            if (particleT == null)
            {
                particleT = IsURP ? Resources.Load<Material>("SK_Particle") : null;
                if (particleT == null)
                {
                    var sh = IsURP ? Shader.Find("Universal Render Pipeline/Particles/Unlit") : null;
                    if (sh == null) sh = Shader.Find("Particles/Standard Unlit");
                    if (sh == null) sh = Shader.Find("Sprites/Default");
                    particleT = new Material(sh);
                }
            }
            var m = new Material(particleT);
            ConfigureParticle(m);
            SetBase(m, c);
            m.mainTexture = SoftDot();
            if (m.HasProperty("_BaseMap")) m.SetTexture("_BaseMap", SoftDot());
            return m;
        }

        public static Material Skybox()
        {
            var m = Resources.Load<Material>("SK_Sky");
            if (m == null)
            {
                var sh = Shader.Find("Skybox/Procedural");
                if (sh == null) return null;
                m = new Material(sh);
            }
            m = new Material(m);
            if (m.HasProperty("_SkyTint")) m.SetColor("_SkyTint", new Color(0.62f, 0.42f, 0.78f));
            if (m.HasProperty("_GroundColor")) m.SetColor("_GroundColor", new Color(0.18f, 0.12f, 0.26f));
            if (m.HasProperty("_AtmosphereThickness")) m.SetFloat("_AtmosphereThickness", 1.7f);
            if (m.HasProperty("_Exposure")) m.SetFloat("_Exposure", 1.15f);
            if (m.HasProperty("_SunSize")) m.SetFloat("_SunSize", 0.06f);
            return m;
        }

        // ---------- procedural textures ----------

        static Texture2D NewTex(int w, int h, bool point = false)
        {
            var t = new Texture2D(w, h, TextureFormat.RGBA32, true)
            {
                wrapMode = TextureWrapMode.Repeat,
                filterMode = point ? FilterMode.Point : FilterMode.Trilinear,
                anisoLevel = 8
            };
            return t;
        }

        public static Texture2D RoadTexture()
        {
            var t = NewTex(128, 256);
            var px = new Color[128 * 256];
            for (int y = 0; y < 256; y++)
            for (int x = 0; x < 128; x++)
            {
                float u = x / 127f, v = y / 255f;
                float n = Mathf.PerlinNoise(x * 0.35f, y * 0.35f) * 0.05f + Random.value * 0.02f;
                Color c = new Color(0.17f + n, 0.16f + n, 0.22f + n);
                if ((u > 0.025f && u < 0.055f) || (u > 0.945f && u < 0.975f)) c = new Color(0.92f, 0.9f, 0.95f);
                if (u > 0.488f && u < 0.512f && v < 0.45f) c = new Color(1f, 0.82f, 0.35f);
                px[y * 128 + x] = c;
            }
            t.SetPixels(px);
            t.Apply(true);
            return t;
        }

        public static Texture2D CurbTexture()
        {
            var t = NewTex(8, 32, true);
            var px = new Color[8 * 32];
            for (int y = 0; y < 32; y++)
            for (int x = 0; x < 8; x++)
                px[y * 8 + x] = y < 16 ? new Color(0.95f, 0.25f, 0.45f) : new Color(0.95f, 0.95f, 1f);
            t.SetPixels(px);
            t.Apply(true);
            return t;
        }

        public static Texture2D GrassTexture(Color a, Color b)
        {
            var t = NewTex(128, 128);
            var px = new Color[128 * 128];
            float ox = Random.value * 100f;
            for (int y = 0; y < 128; y++)
            for (int x = 0; x < 128; x++)
            {
                float n = Mathf.PerlinNoise(ox + x * 0.08f, y * 0.08f) * 0.7f + Mathf.PerlinNoise(x * 0.4f, ox + y * 0.4f) * 0.3f;
                px[y * 128 + x] = Color.Lerp(a, b, n) * (0.92f + Random.value * 0.08f);
            }
            t.SetPixels(px);
            t.Apply(true);
            return t;
        }

        public static Texture2D CheckerTexture()
        {
            var t = NewTex(2, 2, true);
            t.SetPixels(new[] { Color.white, new Color(0.08f, 0.06f, 0.12f), new Color(0.08f, 0.06f, 0.12f), Color.white });
            t.Apply(true);
            return t;
        }

        public static Texture2D ChevronTexture()
        {
            var t = NewTex(64, 64);
            var px = new Color[64 * 64];
            for (int y = 0; y < 64; y++)
            for (int x = 0; x < 64; x++)
            {
                float u = x / 63f, v = y / 63f;
                float f = Mathf.Repeat(v * 2f - Mathf.Abs(u - 0.5f) * 1.3f, 1f);
                px[y * 64 + x] = f < 0.42f ? Color.white : new Color(0.25f, 0.12f, 0.05f);
            }
            t.SetPixels(px);
            t.Apply(true);
            return t;
        }

        public static Texture2D SoftDot()
        {
            if (softDot != null) return softDot;
            softDot = new Texture2D(32, 32, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp };
            var px = new Color[32 * 32];
            for (int y = 0; y < 32; y++)
            for (int x = 0; x < 32; x++)
            {
                float d = Vector2.Distance(new Vector2(x, y), new Vector2(15.5f, 15.5f)) / 15.5f;
                float a = Mathf.Clamp01(1f - d);
                px[y * 32 + x] = new Color(1f, 1f, 1f, a * a);
            }
            softDot.SetPixels(px);
            softDot.Apply();
            return softDot;
        }

        // ---------- primitives ----------

        public static GameObject Prim(PrimitiveType type, Transform parent, Vector3 localPos, Vector3 scale, Material mat,
            bool keepCollider = false, string name = null)
        {
            var go = GameObject.CreatePrimitive(type);
            if (name != null) go.name = name;
            if (!keepCollider) Object.DestroyImmediate(go.GetComponent<Collider>());
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localScale = scale;
            if (mat != null) go.GetComponent<Renderer>().sharedMaterial = mat;
            return go;
        }

        public static ParticleSystem Particles(Transform parent, Vector3 localPos, Quaternion localRot, Color c,
            float rate, float speed, float size, float life)
        {
            var go = new GameObject("FX");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localRotation = localRot;
            var ps = go.AddComponent<ParticleSystem>();
            var main = ps.main;
            main.loop = true;
            main.startLifetime = new ParticleSystem.MinMaxCurve(life * 0.6f, life);
            main.startSpeed = new ParticleSystem.MinMaxCurve(speed * 0.5f, speed);
            main.startSize = new ParticleSystem.MinMaxCurve(size * 0.6f, size);
            main.startColor = c;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.maxParticles = 300;
            main.gravityModifier = 0.4f;
            var em = ps.emission;
            em.rateOverTime = rate;
            em.enabled = false;
            var sh = ps.shape;
            sh.shapeType = ParticleSystemShapeType.Cone;
            sh.angle = 22f;
            sh.radius = 0.08f;
            var col = ps.colorOverLifetime;
            col.enabled = true;
            var g = new Gradient();
            g.SetKeys(new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) },
                new[] { new GradientAlphaKey(1f, 0f), new GradientAlphaKey(0f, 1f) });
            col.color = g;
            go.GetComponent<ParticleSystemRenderer>().sharedMaterial = Particle(Color.white);
            ps.Play();
            return ps;
        }

        // ---------- synthesized audio ----------

        const int Rate = 22050;

        static float Saw(float x) => 2f * (x - Mathf.Floor(x + 0.5f));

        /// <summary>Seamless 1-second engine loop (whole number of cycles for every partial).</summary>
        public static AudioClip EngineClip()
        {
            var data = new float[Rate];
            for (int i = 0; i < Rate; i++)
            {
                float t = i / (float)Rate;
                float s = Saw(60f * t) * 0.45f + Saw(120f * t) * 0.2f + Mathf.Sin(2f * Mathf.PI * 30f * t) * 0.35f
                          + Mathf.Sin(2f * Mathf.PI * 240f * t) * 0.06f;
                data[i] = s * 0.35f;
            }
            var clip = AudioClip.Create("engine", Rate, 1, Rate, false);
            clip.SetData(data, 0);
            return clip;
        }

        /// <summary>Simple synth blip: frequency sweep, optional noise, exponential decay.</summary>
        public static AudioClip Tone(string name, float f0, float f1, float dur, float noise = 0f, float vol = 0.5f, bool square = false)
        {
            int n = Mathf.CeilToInt(dur * Rate);
            var data = new float[n];
            float phase = 0f;
            for (int i = 0; i < n; i++)
            {
                float k = i / (float)n;
                float f = Mathf.Lerp(f0, f1, k);
                phase += f / Rate;
                float s = square ? Mathf.Sign(Mathf.Sin(2f * Mathf.PI * phase)) * 0.6f : Mathf.Sin(2f * Mathf.PI * phase);
                s = Mathf.Lerp(s, Random.Range(-1f, 1f), noise);
                float env = Mathf.Min(1f, i / (0.005f * Rate)) * Mathf.Exp(-k * 3.5f);
                data[i] = s * env * vol;
            }
            var clip = AudioClip.Create(name, n, 1, Rate, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
