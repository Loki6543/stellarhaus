using UnityEngine;
using UnityEngine.UI;

namespace StellarKart
{
    public static class Fmt
    {
        public static string Suffix(int n)
        {
            int t = n % 100;
            if (t >= 11 && t <= 13) return "th";
            switch (n % 10) { case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th"; }
        }

        public static string Ordinal(int n) => n + Suffix(n);

        public static string Time(float t)
        {
            if (t < 0f) t = 0f;
            int m = (int)(t / 60f);
            return m + ":" + (t - m * 60f).ToString("00.00");
        }

        public static string Hex(Color c) => "#" + ColorUtility.ToHtmlStringRGB(c);
    }

    public static class UI
    {
        public static RectTransform Rect(Transform parent, string name)
        {
            var go = new GameObject(name, typeof(RectTransform));
            var rt = (RectTransform)go.transform;
            rt.SetParent(parent, false);
            return rt;
        }

        public static RectTransform Stretch(Transform parent, string name)
        {
            var rt = Rect(parent, name);
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            return rt;
        }

        public static Text Label(RectTransform parent, string name, int size, Vector2 anchor, Vector2 pos, Vector2 box, TextAnchor align)
        {
            var rt = Rect(parent, name);
            rt.anchorMin = rt.anchorMax = rt.pivot = anchor;
            rt.anchoredPosition = pos;
            rt.sizeDelta = box;
            var t = rt.gameObject.AddComponent<Text>();
            t.font = MatLib.UIFont;
            t.fontSize = size;
            t.alignment = align;
            t.color = Color.white;
            t.supportRichText = true;
            t.horizontalOverflow = HorizontalWrapMode.Overflow;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.raycastTarget = false;
            var o = rt.gameObject.AddComponent<Outline>();
            o.effectColor = new Color(0f, 0f, 0f, 0.75f);
            o.effectDistance = new Vector2(2f, -2f);
            return t;
        }

        public static Image Panel(RectTransform parent, string name, Vector2 anchor, Vector2 pos, Vector2 size, Color c)
        {
            var rt = Rect(parent, name);
            rt.anchorMin = rt.anchorMax = rt.pivot = anchor;
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;
            var img = rt.gameObject.AddComponent<Image>();
            img.color = c;
            img.raycastTarget = false;
            return img;
        }
    }

    /// <summary>Per-player HUD laid over that player's viewport on the shared overlay canvas.</summary>
    public class Hud : MonoBehaviour
    {
        Kart kart;
        Text place, lap, timer, item, speed, center, warn;
        Image itemBg, driftBar;
        float centerTimer;
        Color centerColor;

        public static Hud Create(Kart k, RectTransform canvas, Rect viewport)
        {
            var rt = UI.Rect(canvas, "HUD_" + k.Name);
            rt.anchorMin = viewport.min;
            rt.anchorMax = viewport.max;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            var h = rt.gameObject.AddComponent<Hud>();
            h.kart = k;

            h.place = UI.Label(rt, "Place", 72, new Vector2(0f, 1f), new Vector2(24f, -6f), new Vector2(240f, 90f), TextAnchor.UpperLeft);
            h.lap = UI.Label(rt, "Lap", 28, new Vector2(0f, 1f), new Vector2(28f, -92f), new Vector2(400f, 40f), TextAnchor.UpperLeft);
            h.timer = UI.Label(rt, "Time", 28, new Vector2(1f, 1f), new Vector2(-24f, -14f), new Vector2(300f, 40f), TextAnchor.UpperRight);
            h.itemBg = UI.Panel(rt, "ItemBg", new Vector2(1f, 1f), new Vector2(-24f, -58f), new Vector2(230f, 60f), new Color(0f, 0f, 0f, 0.45f));
            h.item = UI.Label((RectTransform)h.itemBg.transform, "Item", 24, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(220f, 56f), TextAnchor.MiddleCenter);
            h.speed = UI.Label(rt, "Speed", 30, new Vector2(1f, 0f), new Vector2(-24f, 16f), new Vector2(300f, 44f), TextAnchor.LowerRight);
            var back = UI.Panel(rt, "DriftBack", new Vector2(0f, 0f), new Vector2(24f, 24f), new Vector2(240f, 14f), new Color(0f, 0f, 0f, 0.45f));
            h.driftBar = UI.Panel((RectTransform)back.transform, "DriftBar", new Vector2(0f, 0.5f), Vector2.zero, new Vector2(0f, 14f), Color.white);
            h.center = UI.Label(rt, "Center", 96, new Vector2(0.5f, 0.5f), new Vector2(0f, 40f), new Vector2(900f, 140f), TextAnchor.MiddleCenter);
            h.warn = UI.Label(rt, "Warn", 42, new Vector2(0.5f, 0.5f), new Vector2(0f, -60f), new Vector2(900f, 60f), TextAnchor.MiddleCenter);
            h.warn.color = new Color(1f, 0.35f, 0.35f);
            h.center.text = "";
            return h;
        }

        public void Flash(string text, Color c, float duration)
        {
            center.text = text;
            centerColor = c;
            centerTimer = duration;
        }

        void Update()
        {
            if (kart == null) return;
            var gf = GameFlow.I;
            float dt = Time.deltaTime;

            Color pc = kart.Place == 1 ? new Color(1f, 0.84f, 0.3f) : kart.Place <= 3 ? new Color(0.85f, 0.9f, 1f) : Color.white;
            place.text = kart.Place + "<size=36>" + Fmt.Suffix(kart.Place) + "</size>";
            place.color = pc;

            string who = "<color=" + Fmt.Hex(kart.Color) + ">" + kart.Name.ToUpper() + "</color>";
            lap.text = kart.Finished ? who + "  FINISHED" : who + "  LAP " + Mathf.Clamp(kart.Lap, 1, GameFlow.Laps) + "/" + GameFlow.Laps;
            timer.text = Fmt.Time(kart.Finished ? kart.FinishTime : gf != null ? gf.RaceTime : 0f);

            if (kart.Rolling)
            {
                var t = (ItemType)(1 + (int)(Time.time * 14f) % 5);
                item.text = Items.Label(t, 3);
                itemBg.color = Items.Tint(t) * new Color(1f, 1f, 1f, 0.55f);
            }
            else if (kart.HeldItem != ItemType.None)
            {
                item.text = Items.Label(kart.HeldItem, kart.ItemCount);
                itemBg.color = Items.Tint(kart.HeldItem) * new Color(1f, 1f, 1f, 0.75f);
            }
            else
            {
                item.text = "<color=#8888aa>no item</color>";
                itemBg.color = new Color(0f, 0f, 0f, 0.45f);
            }

            speed.text = Mathf.RoundToInt(Mathf.Abs(kart.Speed) * 3.6f) + "<size=20> km/h</size>" + (kart.Shielded ? "  <color=#66ddff>SHIELD</color>" : "");

            float fill = kart.Drifting ? Mathf.Clamp01(kart.DriftCharge / 2.8f) : 0f;
            driftBar.rectTransform.sizeDelta = new Vector2(240f * fill, 14f);
            driftBar.color = Kart.TierColors[kart.DriftTier];

            if (centerTimer > 0f)
            {
                centerTimer -= dt;
                var c = centerColor;
                c.a = Mathf.Clamp01(centerTimer * 2f);
                center.color = c;
                if (centerTimer <= 0f) center.text = "";
            }

            warn.text = kart.WrongWay && !kart.Finished ? "WRONG WAY!" : "";
        }
    }

    /// <summary>Smooth chase camera with speed-based FOV.</summary>
    public class ChaseCam : MonoBehaviour
    {
        Kart target;
        Camera cam;
        Vector3 vel;
        float yaw;

        public void SetTarget(Kart k)
        {
            target = k;
            cam = GetComponent<Camera>();
            Snap();
        }

        public void Snap()
        {
            if (target == null) return;
            yaw = target.Heading;
            var q = Quaternion.Euler(0f, yaw, 0f);
            transform.position = target.transform.position + q * new Vector3(0f, 2.6f, -6.8f);
            transform.rotation = Quaternion.LookRotation(target.transform.position + Vector3.up * 1.1f + q * Vector3.forward * 4f - transform.position);
            vel = Vector3.zero;
        }

        void LateUpdate()
        {
            if (target == null) return;
            float dt = Time.deltaTime;
            yaw = Mathf.LerpAngle(yaw, target.Heading, 1f - Mathf.Exp(-6f * dt));
            var q = Quaternion.Euler(0f, yaw, 0f);
            Vector3 tp = target.transform.position;
            Vector3 desired = tp + q * new Vector3(0f, 2.6f, -6.8f);
            transform.position = Vector3.SmoothDamp(transform.position, desired, ref vel, 0.06f);
            transform.rotation = Quaternion.LookRotation(tp + Vector3.up * 1.1f + q * Vector3.forward * 4f - transform.position);
            float fov = 60f + 14f * Mathf.Clamp01(target.Speed / target.MaxSpeed) + (target.Boosting ? 8f : 0f);
            cam.fieldOfView = Mathf.Lerp(cam.fieldOfView, fov, 1f - Mathf.Exp(-4f * dt));
        }
    }
}
