using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.SceneManagement;

namespace StellarKart.EditorTools
{
    /// <summary>
    /// First-open setup: assigns a URP pipeline asset if the project has none, writes material
    /// templates into Resources (so player builds keep the URP shaders), and creates the race scene.
    /// Safe to re-run from the "Stellar Kart" menu.
    /// </summary>
    [InitializeOnLoad]
    static class StellarKartSetup
    {
        const string Root = "Assets/StellarKart";
        const string SettingsDir = Root + "/Settings";
        const string ResourcesDir = Root + "/Resources";
        const string ScenePath = Root + "/Scenes/StellarKart.unity";

        static StellarKartSetup() => EditorApplication.delayCall += () => Run(false);

        [MenuItem("Stellar Kart/Repair Project Setup")]
        static void RunFromMenu() => Run(true);

        [MenuItem("Stellar Kart/Open Race Scene")]
        static void OpenScene()
        {
            if (File.Exists(ScenePath) && EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
                EditorSceneManager.OpenScene(ScenePath);
        }

        static void Run(bool verbose)
        {
            if (EditorApplication.isPlayingOrWillChangePlaymode) return;
            bool changed = EnsurePipeline();
            changed |= EnsureMaterials();
            changed |= EnsureScene();
            if (changed || verbose) Debug.Log("[Stellar Kart] Project setup complete. Press Play in the StellarKart scene.");
        }

        static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            string parent = Path.GetDirectoryName(path).Replace('\\', '/');
            EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
        }

        static bool EnsurePipeline()
        {
            if (GraphicsSettings.defaultRenderPipeline != null) return false;
            EnsureFolder(SettingsDir);
            string assetPath = SettingsDir + "/StellarKart_URP.asset";
            var asset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(assetPath);
            if (asset == null)
            {
                var data = ScriptableObject.CreateInstance<UniversalRendererData>();
                AssetDatabase.CreateAsset(data, SettingsDir + "/StellarKart_Renderer.asset");
                asset = UniversalRenderPipelineAsset.Create(data);
                asset.supportsHDR = true;
                asset.shadowDistance = 150f;
                asset.msaaSampleCount = 4;
                AssetDatabase.CreateAsset(asset, assetPath);
                AssetDatabase.SaveAssets();
            }
            GraphicsSettings.defaultRenderPipeline = asset;
            QualitySettings.renderPipeline = asset;
            Debug.Log("[Stellar Kart] Assigned URP pipeline asset " + assetPath);
            return true;
        }

        static bool EnsureMaterials()
        {
            var lit = Shader.Find("Universal Render Pipeline/Lit");
            if (lit == null) return false;
            EnsureFolder(ResourcesDir);
            bool changed = MakeMat("SK_Lit", lit, null);
            changed |= MakeMat("SK_LitEmissive", lit, m => MatLib.ConfigureEmission(m, Color.white));
            changed |= MakeMat("SK_LitTransparent", lit, MatLib.ConfigureTransparent);
            var particles = Shader.Find("Universal Render Pipeline/Particles/Unlit");
            if (particles != null) changed |= MakeMat("SK_Particle", particles, MatLib.ConfigureParticle);
            var sky = Shader.Find("Skybox/Procedural");
            if (sky != null) changed |= MakeMat("SK_Sky", sky, null);
            if (changed) AssetDatabase.SaveAssets();
            return changed;
        }

        static bool MakeMat(string name, Shader shader, System.Action<Material> configure)
        {
            string path = ResourcesDir + "/" + name + ".mat";
            if (AssetDatabase.LoadAssetAtPath<Material>(path) != null) return false;
            var m = new Material(shader);
            configure?.Invoke(m);
            AssetDatabase.CreateAsset(m, path);
            return true;
        }

        static bool EnsureScene()
        {
            if (File.Exists(ScenePath)) return false;
            EnsureFolder(Root + "/Scenes");
            var active = SceneManager.GetActiveScene();
            bool replace = !active.isDirty;
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, replace ? NewSceneMode.Single : NewSceneMode.Additive);
            var go = new GameObject("StellarKart");
            go.AddComponent<GameFlow>();
            SceneManager.MoveGameObjectToScene(go, scene);
            EditorSceneManager.SaveScene(scene, ScenePath);
            if (!replace) EditorSceneManager.CloseScene(scene, true);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            return true;
        }
    }
}
