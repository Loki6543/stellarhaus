using UnityEngine;

namespace StellarKart
{
    public enum ItemType { None, Comet, CometTrio, NovaOrb, StardustMine, OrbitShield }

    public static class Items
    {
        public static string Label(ItemType t, int count)
        {
            switch (t)
            {
                case ItemType.Comet: return "COMET";
                case ItemType.CometTrio: return "COMET x" + count;
                case ItemType.NovaOrb: return "NOVA ORB";
                case ItemType.StardustMine: return "STARDUST MINE";
                case ItemType.OrbitShield: return "ORBIT SHIELD";
                default: return "";
            }
        }

        public static Color Tint(ItemType t)
        {
            switch (t)
            {
                case ItemType.Comet:
                case ItemType.CometTrio: return new Color(1f, 0.62f, 0.25f);
                case ItemType.NovaOrb: return new Color(1f, 0.4f, 0.85f);
                case ItemType.StardustMine: return new Color(0.7f, 0.45f, 1f);
                case ItemType.OrbitShield: return new Color(0.35f, 0.85f, 1f);
                default: return Color.gray;
            }
        }

        /// <summary>Position-weighted roll: leaders get defence, the pack gets speed and offence.</summary>
        public static ItemType Roll(int place, int total)
        {
            float f = total > 1 ? (place - 1f) / (total - 1f) : 0f;
            float[] w =
            {
                0f,
                2.5f + 2f * f,      // Comet
                0.2f + 3f * f * f,  // Comet trio
                2f + 1.5f * f,      // Nova Orb
                3f - 2.2f * f,      // Stardust Mine
                2.5f - 1.2f * f     // Orbit Shield
            };
            float sum = 0f;
            foreach (var x in w) sum += x;
            float r = Random.value * sum;
            for (int i = 1; i < w.Length; i++)
            {
                r -= w[i];
                if (r <= 0f) return (ItemType)i;
            }
            return ItemType.Comet;
        }

        public static void Use(Kart k, ItemType t)
        {
            switch (t)
            {
                case ItemType.Comet:
                case ItemType.CometTrio: k.Boost(1.45f, 1.5f); break;
                case ItemType.NovaOrb: NovaOrb.Fire(k); break;
                case ItemType.StardustMine: StardustMine.Drop(k); break;
                case ItemType.OrbitShield: k.Shield(9f); break;
            }
        }
    }

    /// <summary>Homing projectile: follows the track, then locks onto the kart ahead when close.</summary>
    public class NovaOrb : MonoBehaviour
    {
        Kart owner, target;
        int idx;
        float age;
        static Material mat;

        public static void Fire(Kart owner)
        {
            var gf = GameFlow.I;
            if (gf == null) return;
            if (mat == null) mat = MatLib.Emissive(new Color(1f, 0.4f, 0.85f), 4f);
            var go = MatLib.Prim(PrimitiveType.Sphere, gf.RaceRoot, Vector3.zero, Vector3.one * 0.9f, mat, false, "NovaOrb");
            go.transform.position = owner.transform.position + owner.Forward * 2.4f + Vector3.up * 0.7f;
            var light = go.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(1f, 0.4f, 0.85f);
            light.range = 7f;
            light.intensity = 3f;
            var o = go.AddComponent<NovaOrb>();
            o.owner = owner;
            o.idx = owner.PathIndex;
            o.target = gf.KartAhead(owner);
        }

        void Update()
        {
            var gf = GameFlow.I;
            if (gf == null || gf.Path == null) { Destroy(gameObject); return; }
            float dt = Time.deltaTime;
            age += dt;
            if (age > 7f) { Destroy(gameObject); return; }

            var path = gf.Path;
            Vector3 p = transform.position;
            idx = path.Nearest(p, idx, 20);
            Vector3 aim;
            if (target != null && (target.transform.position - p).sqrMagnitude < 30f * 30f)
                aim = target.transform.position + Vector3.up * 0.6f;
            else
            {
                int a = path.Wrap(idx + 8);
                aim = path.pts[a] + Vector3.up * 0.8f;
            }
            transform.position = Vector3.MoveTowards(p, aim, 48f * dt);
            transform.Rotate(0f, 720f * dt, 0f);

            foreach (var k in gf.Karts)
            {
                if (k == owner && age < 0.6f) continue;
                if ((k.transform.position + Vector3.up * 0.6f - transform.position).sqrMagnitude < 1.8f * 1.8f)
                {
                    k.Hit();
                    Destroy(gameObject);
                    return;
                }
            }
        }
    }

    /// <summary>Spiky trap left on the road behind the kart.</summary>
    public class StardustMine : MonoBehaviour
    {
        Kart owner;
        float age;
        static Material core, spike;

        public static void Drop(Kart owner)
        {
            var gf = GameFlow.I;
            if (gf == null) return;
            if (core == null)
            {
                core = MatLib.Emissive(new Color(0.7f, 0.45f, 1f), 3f);
                spike = MatLib.Lit(new Color(0.2f, 0.12f, 0.3f), 0.8f, 0.6f);
            }
            Vector3 pos = owner.transform.position - owner.Forward * 2.6f;
            if (Physics.Raycast(pos + Vector3.up * 3f, Vector3.down, out RaycastHit hit, 8f, ~0, QueryTriggerInteraction.Ignore)
                && hit.rigidbody == null)
                pos = hit.point;
            var go = new GameObject("StardustMine");
            go.transform.SetParent(gf.RaceRoot, false);
            go.transform.position = pos;
            MatLib.Prim(PrimitiveType.Sphere, go.transform, Vector3.up * 0.45f, Vector3.one * 0.7f, core);
            for (int i = 0; i < 6; i++)
            {
                var s = MatLib.Prim(PrimitiveType.Cube, go.transform, Vector3.up * 0.45f, new Vector3(0.14f, 1.2f, 0.14f), spike);
                s.transform.localRotation = Quaternion.Euler(i * 30f, i * 60f, i % 2 == 0 ? 45f : -45f);
            }
            go.AddComponent<StardustMine>().owner = owner;
        }

        void Update()
        {
            var gf = GameFlow.I;
            if (gf == null) return;
            age += Time.deltaTime;
            transform.Rotate(0f, 60f * Time.deltaTime, 0f);
            if (age > 45f) { Destroy(gameObject); return; }
            foreach (var k in gf.Karts)
            {
                if (k == owner && age < 1f) continue;
                if ((k.transform.position - transform.position).sqrMagnitude < 1.7f * 1.7f)
                {
                    k.Hit();
                    Destroy(gameObject);
                    return;
                }
            }
        }
    }

    public class ItemBox : MonoBehaviour
    {
        GameObject visual;
        float cooldown, phase;
        static Material shell, star;

        public static ItemBox Create(Transform parent, Vector3 pos)
        {
            if (shell == null)
            {
                shell = MatLib.Transparent(new Color(0.55f, 0.8f, 1f, 0.35f), new Color(0.3f, 0.55f, 1f) * 1.3f);
                star = MatLib.Emissive(new Color(1f, 0.85f, 0.3f), 3.5f);
            }
            var go = new GameObject("ItemBox");
            go.transform.SetParent(parent, false);
            go.transform.position = pos;
            var b = go.AddComponent<ItemBox>();
            b.visual = new GameObject("Visual");
            b.visual.transform.SetParent(go.transform, false);
            b.visual.transform.localPosition = Vector3.up;
            MatLib.Prim(PrimitiveType.Cube, b.visual.transform, Vector3.zero, Vector3.one * 1.3f, shell);
            var s = MatLib.Prim(PrimitiveType.Cube, b.visual.transform, Vector3.zero, Vector3.one * 0.45f, star);
            s.transform.localRotation = Quaternion.Euler(45f, 0f, 45f);
            b.phase = Random.value * 6f;
            return b;
        }

        public void ResetBox()
        {
            cooldown = 0f;
            visual.SetActive(true);
        }

        void Update()
        {
            float dt = Time.deltaTime;
            if (cooldown > 0f)
            {
                cooldown -= dt;
                if (cooldown <= 0f) visual.SetActive(true);
                return;
            }
            visual.transform.Rotate(30f * dt, 60f * dt, 0f, Space.Self);
            visual.transform.localPosition = Vector3.up * (1.0f + Mathf.Sin(Time.time * 2f + phase) * 0.15f);
            var gf = GameFlow.I;
            if (gf == null) return;
            foreach (var k in gf.Karts)
            {
                if ((k.transform.position - transform.position).sqrMagnitude < 2.2f * 2.2f)
                {
                    k.TryStartRoulette();
                    visual.SetActive(false);
                    cooldown = 2.5f;
                    return;
                }
            }
        }
    }

    public class BoostPad : MonoBehaviour
    {
        static Material mat;

        public static void Create(Transform parent, Vector3 pos, Vector3 forward)
        {
            if (mat == null) mat = MatLib.EmissiveTextured(MatLib.ChevronTexture(), new Color(1f, 0.55f, 0.2f), 2.5f);
            var go = new GameObject("BoostPad");
            go.transform.SetParent(parent, false);
            go.transform.SetPositionAndRotation(pos + Vector3.up * 0.04f, Quaternion.LookRotation(forward));
            var q = MatLib.Prim(PrimitiveType.Quad, go.transform, Vector3.zero, new Vector3(4f, 5f, 1f), mat);
            q.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            go.AddComponent<BoostPad>();
        }

        void Update()
        {
            mat.mainTextureOffset = new Vector2(0f, -Time.time * 1.5f);
            if (mat.HasProperty("_BaseMap")) mat.SetTextureOffset("_BaseMap", mat.mainTextureOffset);
            var gf = GameFlow.I;
            if (gf == null) return;
            foreach (var k in gf.Karts)
            {
                Vector3 lp = transform.InverseTransformPoint(k.transform.position);
                if (Mathf.Abs(lp.x) < 2.2f && Mathf.Abs(lp.z) < 2.7f && Mathf.Abs(lp.y) < 1.5f && !k.Boosting)
                    k.Boost(1.4f, 1.0f);
            }
        }
    }
}
