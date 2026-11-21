using System;
using System.Collections.Generic;
using UnityEngine;
using Random = UnityEngine.Random;

namespace StellarKart
{
    /// <summary>Closed centre-line of the circuit, densely sampled.</summary>
    public class TrackPath
    {
        public readonly Vector3[] pts, fwd, right;
        public readonly float[] dist;
        public readonly float Length, HalfWidth;
        public int Count => pts.Length;
        public float SampleLength => Length / pts.Length;

        public TrackPath(Vector3[] points, float halfWidth)
        {
            int n = points.Length;
            pts = points;
            HalfWidth = halfWidth;
            fwd = new Vector3[n];
            right = new Vector3[n];
            dist = new float[n];
            for (int i = 0; i < n; i++)
            {
                fwd[i] = (pts[Wrap(i + 1)] - pts[Wrap(i - 1)]).normalized;
                var flat = new Vector3(fwd[i].x, 0f, fwd[i].z).normalized;
                right[i] = Vector3.Cross(Vector3.up, flat).normalized;
                if (i > 0) dist[i] = dist[i - 1] + Vector3.Distance(pts[i - 1], pts[i]);
            }
            Length = dist[n - 1] + Vector3.Distance(pts[n - 1], pts[0]);
        }

        public int Wrap(int i) => ((i % pts.Length) + pts.Length) % pts.Length;

        public static float Yaw(Vector3 dir) => Mathf.Atan2(dir.x, dir.z) * Mathf.Rad2Deg;

        /// <summary>Nearest sample to p, searching ±window around hint (a full search when window is large).</summary>
        public int Nearest(Vector3 p, int hint, int window)
        {
            int n = pts.Length;
            if (window * 2 >= n) { hint = 0; window = n / 2; }
            int best = Wrap(hint);
            float bestD = float.MaxValue;
            for (int o = -window; o <= window; o++)
            {
                int i = Wrap(hint + o);
                float d = (pts[i] - p).sqrMagnitude;
                if (d < bestD) { bestD = d; best = i; }
            }
            return best;
        }

        public float Lateral(Vector3 p, int i) => Vector3.Dot(p - pts[i], right[i]);
    }

    public static class TrackBuilder
    {
        public const float Shoulder = 8f, Curb = 1.2f, GroundY = -9f;

        public class Result
        {
            public readonly List<ItemBox> Boxes = new List<ItemBox>();
            public Vector3 Center;
            public void ResetItems() { foreach (var b in Boxes) if (b) b.ResetBox(); }
        }

        /// <summary>
        /// "Nebula Loop": a three-lobed star-shaped circuit with rolling hills.
        /// Star-shaped (radius always positive) so it never self-intersects.
        /// </summary>
        public static Vector3[] GeneratePoints(int n)
        {
            var arr = new Vector3[n];
            for (int i = 0; i < n; i++)
            {
                float th = i / (float)n * Mathf.PI * 2f;
                float r = 135f * (1f + 0.22f * Mathf.Sin(3f * th) + 0.08f * Mathf.Cos(5f * th + 0.7f));
                float y = 4.5f * Mathf.Sin(2f * th + 0.4f) + 1.5f * Mathf.Sin(5f * th);
                arr[i] = new Vector3(Mathf.Cos(th) * r * 1.15f, y, Mathf.Sin(th) * r);
            }
            return arr;
        }

        public static Result Build(TrackPath p, Transform parent)
        {
            var res = new Result();
            var root = new GameObject("Track").transform;
            root.SetParent(parent, false);
            float hw = p.HalfWidth, edge = hw + Shoulder;
            foreach (var v in p.pts) res.Center += v;
            res.Center /= p.Count;
            res.Center.y = 0f;

            // One continuous drivable collider (road + curbs + shoulders) avoids seam bumps.
            var col = new GameObject("TrackCollider");
            col.transform.SetParent(root, false);
            col.AddComponent<MeshCollider>().sharedMesh =
                Ribbon(p, new[] { -edge, -hw - Curb, -hw, hw, hw + Curb, edge }, 0f, 10f, false);

            MeshObj(root, "Road", Ribbon(p, new[] { -hw, hw }, 0f, hw * 2f, false),
                MatLib.Textured(MatLib.RoadTexture(), Color.white, 0.35f));
            var curb = MatLib.Textured(MatLib.CurbTexture(), Color.white, 0.4f);
            MeshObj(root, "CurbL", Ribbon(p, new[] { -hw - Curb, -hw }, 0f, 4f, false), curb);
            MeshObj(root, "CurbR", Ribbon(p, new[] { hw, hw + Curb }, 0f, 4f, false), curb);
            var shoulderTex = MatLib.GrassTexture(new Color(0.16f, 0.42f, 0.4f), new Color(0.34f, 0.6f, 0.46f));
            var shoulder = MatLib.Textured(shoulderTex, Color.white, 0.1f);
            MeshObj(root, "ShoulderL", Ribbon(p, new[] { -edge, -hw - Curb }, 0f, 8f, false), shoulder);
            MeshObj(root, "ShoulderR", Ribbon(p, new[] { hw + Curb, edge }, 0f, 8f, false), shoulder);

            // Walls drop to the valley floor: the circuit reads as a raised ribbon with neon rails.
            var wallMat = MatLib.Lit(new Color(0.17f, 0.13f, 0.32f), 0.55f, 0.2f);
            var railL = MatLib.Emissive(new Color(0.3f, 0.9f, 1f), 3f);
            var railR = MatLib.Emissive(new Color(1f, 0.35f, 0.75f), 3f);
            for (int side = -1; side <= 1; side += 2)
            {
                float off = side * edge;
                var wall = Wall(p, off, 1.3f, GroundY);
                MeshObj(root, side < 0 ? "WallL" : "WallR", wall, wallMat).AddComponent<MeshCollider>().sharedMesh = wall;
                MeshObj(root, "Rail", Ribbon(p, new[] { off - 0.25f, off + 0.25f }, 1.32f, 4f, true), side < 0 ? railL : railR);
            }

            var groundTex = MatLib.GrassTexture(new Color(0.12f, 0.2f, 0.3f), new Color(0.24f, 0.32f, 0.42f));
            var ground = MatLib.Prim(PrimitiveType.Plane, root, new Vector3(res.Center.x, GroundY, res.Center.z),
                Vector3.one * 140f, MatLib.Textured(groundTex, Color.white, 0.15f), true, "Valley");
            ground.GetComponent<Renderer>().sharedMaterial.mainTextureScale = new Vector2(180f, 180f);

            BuildStart(p, root);

            foreach (float f in new[] { 0.18f, 0.47f, 0.76f })
            {
                int i = Mathf.RoundToInt(f * p.Count);
                foreach (float lat in new[] { -4.5f, -1.5f, 1.5f, 4.5f })
                    res.Boxes.Add(ItemBox.Create(root, p.pts[i] + p.right[i] * lat));
            }
            float[] padF = { 0.32f, 0.6f, 0.9f }, padLat = { -3f, 3f, 0f };
            for (int k = 0; k < padF.Length; k++)
            {
                int i = Mathf.RoundToInt(padF[k] * p.Count);
                BoostPad.Create(root, p.pts[i] + p.right[i] * padLat[k], p.fwd[i]);
            }

            Decorate(p, root, res.Center);
            return res;
        }

        static void BuildStart(TrackPath p, Transform root)
        {
            float hw = p.HalfWidth;
            var fwd = p.fwd[0];
            var flat = new Vector3(fwd.x, 0f, fwd.z).normalized;
            var checker = MatLib.Textured(MatLib.CheckerTexture(), Color.white, 0.3f);
            checker.mainTextureScale = new Vector2(hw, 1.5f);
            var line = MatLib.Prim(PrimitiveType.Quad, root, p.pts[0] + Vector3.up * 0.03f, new Vector3(hw * 2f, 3f, 1f), checker, false, "StartLine");
            line.transform.rotation = Quaternion.LookRotation(fwd) * Quaternion.Euler(90f, 0f, 0f);

            var arch = new GameObject("StartArch").transform;
            arch.SetParent(root, false);
            arch.SetPositionAndRotation(p.pts[0], Quaternion.LookRotation(flat));
            var pillar = MatLib.Lit(new Color(0.2f, 0.16f, 0.36f), 0.6f, 0.4f);
            float span = hw + 3f;
            MatLib.Prim(PrimitiveType.Cube, arch, new Vector3(-span, 3.5f, 0f), new Vector3(1f, 7f, 1f), pillar, true);
            MatLib.Prim(PrimitiveType.Cube, arch, new Vector3(span, 3.5f, 0f), new Vector3(1f, 7f, 1f), pillar, true);
            MatLib.Prim(PrimitiveType.Cube, arch, new Vector3(0f, 7.4f, 0f), new Vector3(span * 2f + 1f, 1.2f, 1.2f),
                MatLib.Emissive(new Color(1f, 0.45f, 0.7f), 2.2f));
            var banner = MatLib.EmissiveTextured(MatLib.CheckerTexture(), Color.white, 1.4f);
            banner.mainTextureScale = new Vector2(12f, 1f);
            MatLib.Prim(PrimitiveType.Cube, arch, new Vector3(0f, 6.4f, 0f), new Vector3(span * 2f, 0.8f, 0.3f), banner);
        }

        static void Decorate(TrackPath p, Transform root, Vector3 center)
        {
            var state = Random.state;
            Random.InitState(1337);
            var deco = new GameObject("Scenery").transform;
            deco.SetParent(root, false);
            Color[] glow = { new Color(0.3f, 0.9f, 1f), new Color(0.75f, 0.4f, 1f), new Color(1f, 0.45f, 0.7f), new Color(1f, 0.8f, 0.35f) };
            var crystalMats = new Material[glow.Length];
            for (int i = 0; i < glow.Length; i++) crystalMats[i] = MatLib.Emissive(glow[i], 1.8f);
            var stem = MatLib.Lit(new Color(0.85f, 0.8f, 0.7f), 0.2f);
            var caps = new[] { MatLib.Lit(new Color(0.9f, 0.3f, 0.45f), 0.4f), MatLib.Lit(new Color(0.35f, 0.4f, 0.95f), 0.4f), MatLib.Lit(new Color(0.95f, 0.6f, 0.2f), 0.4f) };
            var rock = MatLib.Lit(new Color(0.3f, 0.28f, 0.38f), 0.1f);
            float minClear = p.HalfWidth + Shoulder + 6f;

            int placed = 0, tries = 0;
            while (placed < 170 && tries++ < 2000)
            {
                int i = Random.Range(0, p.Count);
                float side = Random.value < 0.5f ? -1f : 1f;
                Vector3 pos = p.pts[i] + p.right[i] * side * (minClear + Random.Range(2f, 120f));
                pos.y = GroundY;
                int ni = p.Nearest(pos, 0, p.Count);
                var flatNear = p.pts[ni]; flatNear.y = GroundY;
                if (Vector3.Distance(flatNear, pos) < minClear) continue;
                placed++;
                var t = new GameObject("Deco").transform;
                t.SetParent(deco, false);
                t.position = pos;
                t.rotation = Quaternion.Euler(0f, Random.Range(0f, 360f), 0f);
                float roll = Random.value;
                if (roll < 0.4f)
                {
                    int shards = Random.Range(2, 5);
                    var m = crystalMats[Random.Range(0, crystalMats.Length)];
                    for (int s = 0; s < shards; s++)
                    {
                        float h = Random.Range(3f, 11f);
                        var c = MatLib.Prim(PrimitiveType.Cube, t, new Vector3(Random.Range(-1.5f, 1.5f), h * 0.4f, Random.Range(-1.5f, 1.5f)),
                            new Vector3(Random.Range(0.8f, 1.6f), h, Random.Range(0.8f, 1.6f)), m);
                        c.transform.localRotation = Quaternion.Euler(Random.Range(-18f, 18f), Random.Range(0f, 90f), Random.Range(-18f, 18f));
                    }
                }
                else if (roll < 0.75f)
                {
                    float h = Random.Range(4f, 12f), w = Random.Range(4f, 9f);
                    MatLib.Prim(PrimitiveType.Cylinder, t, new Vector3(0f, h * 0.5f, 0f), new Vector3(1.1f, h * 0.5f, 1.1f), stem);
                    MatLib.Prim(PrimitiveType.Sphere, t, new Vector3(0f, h, 0f), new Vector3(w, w * 0.45f, w), caps[Random.Range(0, caps.Length)]);
                }
                else if (roll < 0.9f)
                {
                    float s = Random.Range(2f, 7f);
                    var r = MatLib.Prim(PrimitiveType.Sphere, t, new Vector3(0f, s * 0.2f, 0f), new Vector3(s * 1.3f, s * 0.7f, s), rock);
                    r.transform.localRotation = Quaternion.Euler(Random.Range(0f, 30f), 0f, Random.Range(0f, 30f));
                }
                else
                {
                    var orb = MatLib.Prim(PrimitiveType.Sphere, t, new Vector3(0f, Random.Range(10f, 24f), 0f), Vector3.one * Random.Range(1.2f, 3f),
                        crystalMats[Random.Range(0, crystalMats.Length)]);
                    orb.AddComponent<Bobber>();
                }
            }

            // Distant moons
            MatLib.Prim(PrimitiveType.Sphere, deco, center + new Vector3(-420f, 190f, 520f), Vector3.one * 160f, MatLib.Emissive(new Color(1f, 0.75f, 0.55f), 0.9f));
            MatLib.Prim(PrimitiveType.Sphere, deco, center + new Vector3(560f, 120f, -300f), Vector3.one * 70f, MatLib.Emissive(new Color(0.5f, 0.75f, 1f), 1.1f));
            Random.state = state;
        }

        static GameObject MeshObj(Transform parent, string name, Mesh mesh, Material mat)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial = mat;
            return go;
        }

        static Mesh Ribbon(TrackPath p, float[] offs, float h, float vTile, bool doubleSided) =>
            Strip(p, offs.Length, (i, j) => p.pts[i] + p.right[i] * offs[j] + Vector3.up * h, vTile, doubleSided);

        static Mesh Wall(TrackPath p, float off, float top, float bottom) =>
            Strip(p, 2, (i, j) =>
            {
                var b = p.pts[i] + p.right[i] * off;
                return j == 0 ? new Vector3(b.x, bottom, b.z) : b + Vector3.up * top;
            }, 4f, true);

        /// <summary>Grid mesh along the loop: rows follow the path (closed), k vertices across each row.</summary>
        static Mesh Strip(TrackPath p, int k, Func<int, int, Vector3> vert, float vTile, bool doubleSided)
        {
            int n = p.Count, rows = n + 1, single = rows * k;
            int total = doubleSided ? single * 2 : single;
            var v = new Vector3[total];
            var uv = new Vector2[total];
            for (int r = 0; r < rows; r++)
            {
                int i = r % n;
                float d = r < n ? p.dist[i] : p.Length;
                for (int j = 0; j < k; j++)
                {
                    v[r * k + j] = vert(i, j);
                    uv[r * k + j] = new Vector2(j / (float)(k - 1), d / vTile);
                }
            }
            if (doubleSided)
            {
                Array.Copy(v, 0, v, single, single);
                Array.Copy(uv, 0, uv, single, single);
            }
            int quads = (rows - 1) * (k - 1);
            var tris = new int[quads * 6 * (doubleSided ? 2 : 1)];
            int t = 0;
            for (int pass = 0; pass < (doubleSided ? 2 : 1); pass++)
            {
                int baseV = pass * single;
                for (int r = 0; r < rows - 1; r++)
                for (int j = 0; j < k - 1; j++)
                {
                    int a = baseV + r * k + j, b = a + 1, c = a + k, d = c + 1;
                    if (pass == 0) { tris[t++] = a; tris[t++] = c; tris[t++] = b; tris[t++] = b; tris[t++] = c; tris[t++] = d; }
                    else { tris[t++] = a; tris[t++] = b; tris[t++] = c; tris[t++] = b; tris[t++] = d; tris[t++] = c; }
                }
            }
            var mesh = new Mesh { name = "TrackStrip" };
            if (total > 65000) mesh.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;
            mesh.vertices = v;
            mesh.uv = uv;
            mesh.triangles = tris;
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }
    }

    /// <summary>Gentle floating motion for scenery.</summary>
    public class Bobber : MonoBehaviour
    {
        Vector3 basePos;
        float phase, amp;

        void Start()
        {
            basePos = transform.localPosition;
            phase = Random.value * 10f;
            amp = Random.Range(0.6f, 1.6f);
        }

        void Update() => transform.localPosition = basePos + Vector3.up * Mathf.Sin(Time.time * 0.8f + phase) * amp;
    }
}
