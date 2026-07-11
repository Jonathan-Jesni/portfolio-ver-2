export const PROJECTS = [
  {
    id: "neuro-genesis",
    title: "Neuro-Genesis Engine",
    subtitle: "Self-Modifying Mixture-of-Experts",
    description:
      "Self-modifying Mixture-of-Experts network — on loss spikes, a local Gemma-2-2b-it generates PyTorch source for a new expert module, validated via AST screening + sandboxed execution + smoke test, then hot-swapped into the live MoE mid-training with full rollback on failure. No human in the loop.",
    tech: "PyTorch, ROCm, Gemma-2-2b-it, Mixture-of-Experts, AST Validation",
    tags: ["Agentic AI", "Mixture-of-Experts", "AMD/ROCm"],
    github: "https://github.com/Jonathan-Jesni/neuro-genesis-engine",
    links: [
      { label: "View Source", href: "https://github.com/Jonathan-Jesni/neuro-genesis-engine" },
      { label: "Live Demo", href: "https://neuro-genesis-engine.vercel.app/", demo: true },
    ],
    images: null,
    imageAlts: null,
    pipeline: ["LOSS SPIKE", "GENERATE", "VALIDATE", "HOT-SWAP", "RESUME"],
    note: "Live demo is the run visualizer — not an interactive training system.",
    metric: "Verified on AMD Radeon Pro W7900D (ROCm 7.2) · 300-step self-expanding run · 0 rejected experts",
  },
  {
    id: "double-unet",
    title: "Modified Double U-Net",
    subtitle: "Medical Image Segmentation",
    description:
      "Dual-stacked U-Net for 3-class medical image segmentation (Background, Benign, Malignant). Uses an Ensemble Encoder fusing VGG-19, DenseNet-121, and Xception backbones with Softmax-based Attention Gates to route spatial cues. Optimized via AMP and a combined Cross-Entropy & Dice loss to handle class imbalance, achieving a ~0.85 Validation F1-Score and accelerating training by ~25%.",
    tech: "PyTorch, VGG-19, DenseNet-121, Xception, Deep Learning",
    tags: ["Deep Learning", "Medical Imaging", "Computer Vision"],
    github: "https://github.com/Jonathan-Jesni/Modified_DoubleUNet_Implementation",
    images: [
      "/assets/Modifed double u net/High-Precision Medical Image Segmentation using a Hybrid Xception-VGG DoubleUNet.png",
      "/assets/Modifed double u net/Benign Lesion Segmentation_Jaccard-0.9670.png",
      "/assets/Modifed double u net/Malignant Lesion Segmentation_Jaccard-0.9498.png",
      "/assets/Modifed double u net/Model Architecture Diagram.png",
      "/assets/Modifed double u net/BUSI Quantitative Scores.png",
      "/assets/Modifed double u net/BUSI Training and Validation Curves.png",
    ],
    imageAlts: [
      "High-precision medical image segmentation, Hybrid Xception-VGG DoubleUNet",
      "Benign lesion segmentation result (Jaccard 0.967)",
      "Malignant lesion segmentation result (Jaccard 0.950)",
      "Modified Double U-Net model architecture diagram",
      "BUSI dataset quantitative scores",
      "BUSI training and validation curves",
    ],
    metric: "0.85 F1 (BUSI, 3-class) · ~25% faster training (AMP)",
  },
  {
    id: "bandwidth",
    title: "BandWidth",
    subtitle: "Autonomous Multi-Agent CI/CD Pipeline",
    description:
      "Orchestrated a 5-agent cross-model pipeline (GPT-4o + DeepSeek-V4-Pro) across 6 containerized microservices to autonomously review, test, fix, and document GitHub PRs via the Band collaboration platform. Built a Flask webhook engine intercepting PR events, executing sandboxed pytest validations, and pushing autonomous fix commits via the GitHub REST API. Deployed on Google Cloud with zero dropped handoffs across 30+ autonomous PR cycles and deterministic state-routing.",
    tech: "Python, Flask, Docker, Google Cloud, GitHub API, GPT-4o, DeepSeek-V4-Pro, Band AI, CI/CD, Agentic AI",
    tags: ["Agentic AI", "Multi-Agent", "CI/CD"],
    github: "https://github.com/Jonathan-Jesni/BandWidth",
    links: [
      { label: "View Source", href: "https://github.com/Jonathan-Jesni/BandWidth" },
      { label: "Live Demo", href: "http://34.47.213.229:5000/", demo: true },
    ],
    images: [
      "/assets/Bandwidth/cover.svg",
      "/assets/Bandwidth/Architecture diagram.png",
      "/assets/Bandwidth/Band room mid-run -1.png",
      "/assets/Bandwidth/Band room mid-run.png",
      "/assets/Bandwidth/GitHub PR thread.png",
      "/assets/Bandwidth/GitHub PR thread -1.png",
    ],
    imageAlts: [
      "BandWidth cover",
      "BandWidth multi-agent pipeline architecture diagram",
      "Band collaboration room: agents reviewing a pull request",
      "Band collaboration room: BandWidth Engineer pushing an autonomous fix commit",
      "Autonomously generated pull request documentation on GitHub",
      "GitHub PR thread: a BandWidth agent answering a human reviewer's question",
    ],
    metric: "~2-3 min autonomous review cycle · 30+ autonomous PR cycles, zero dropped handoffs",
  },
  {
    id: "synthrescue",
    title: "SynthRescue",
    subtitle: "Autonomous AI Triage & Synthetic Data Engine",
    description:
      "Autonomous AI triage and synthetic data engine. Engineered a procedural 3D Blender pipeline to automate bounding-box annotations across occluded disaster scenes. Trained a custom YOLOv8 model on ~6,115 images to achieve 96.7% precision, and deployed a low-latency model inference endpoint (FastAPI REST, Docker, GCP) integrating Gemini AI to translate live drone telemetry into actionable triage reports within ~4.5 seconds.",
    tech: "PyTorch, YOLOv8, Blender Python API, Next.js, FastAPI, Google Cloud",
    tags: ["Computer Vision", "Synthetic Data", "Deep Learning"],
    github:
      "https://github.com/Jonathan-Jesni/SynthRescue",
    links: [
      { label: "View Source", href: "https://github.com/Jonathan-Jesni/SynthRescue" },
      { label: "Backend", href: "https://github.com/Jonathan-Jesni/SynthRescue-Engine" },
      { label: "Live Demo", href: "https://synthrescue.vercel.app/", demo: true },
    ],
    images: [
      "/assets/Synthrescue/Live Tactical Command Dashboard.png",
      "/assets/Synthrescue/Live Tactical Command Dashboard 2.png",
      "/assets/Synthrescue/val_batch0_pred.jpg",
      "/assets/Synthrescue/val_batch1_pred.jpg",
      "/assets/Synthrescue/results.png",
      "/assets/Synthrescue/BoxPR_curve.png",
      "/assets/Synthrescue/confusion_matrix_normalized.png",
      "/assets/Synthrescue/System Diagram.png",
    ],
    imageAlts: [
      "Live tactical command dashboard",
      "Tactical command dashboard, detail view",
      "YOLOv8 detection predictions on a validation batch",
      "YOLOv8 detection predictions on a second validation batch",
      "Training results and metrics summary",
      "Precision-recall curve",
      "Normalized confusion matrix",
      "SynthRescue system architecture diagram",
    ],
    metric: "96.7% precision (held-out synthetic val) · >56% false positive reduction vs baseline YOLOv8 · ~4.5s end-to-end",
  },
  {
    id: "ludex",
    title: "Ludex",
    subtitle: "Hybrid Game Recommendation System",
    description:
      "A hybrid recommendation engine combining content-based filtering and collaborative filtering to improve NDCG by ~12-18% over standalone baselines. Integrates diversity-aware re-ranking to increase catalog coverage by ~20% (reducing popularity bias) and handles cold-start user scenarios using metadata-driven fallback logic, evaluated on large-scale Steam interaction data.",
    tech: "Python, Scikit-learn, Implicit ALS, Steam API",
    tags: ["Machine Learning", "Recommendation Systems", "Python"],
    github: "https://github.com/Jonathan-Jesni/LudexSite",
    links: [
      { label: "View Source", href: "https://github.com/Jonathan-Jesni/LudexSite" },
      { label: "Backend", href: "https://github.com/Jonathan-Jesni/Ludex" },
      { label: "Live Demo", href: "https://ludexsite.onrender.com/", demo: true },
    ],
    images: [
      "/assets/Ludex/ludex-dashboard.png",
      "/assets/Ludex/ludex-reccomendations.png",
      "/assets/Ludex/ludex-login.png",
      "/assets/Ludex/Hybrid Scoring Fusion Process.png",
      "/assets/Ludex/model_performance_comparison.png",
      "/assets/Ludex/steam_played_vs_unplayed.png",
      "/assets/Ludex/System Diagram.jpg",
    ],
    imageAlts: [
      "Ludex dashboard",
      "Ludex personalized game recommendations",
      "Ludex login interface",
      "Hybrid scoring fusion process",
      "Model performance comparison",
      "Steam played vs unplayed analysis",
      "Ludex system architecture diagram",
    ],
    metric: "+12-18% NDCG vs standalone CF/CBF baselines (Steam interaction data) · +20% catalog coverage",
  },
] as const;


export const BUILDING = [
  {
    id: "building-observability",
    status: "Active",
    title: "Agent Observability & RAG Tooling",
    description:
      "Instrumenting BandWidth's multi-agent runs — trace capture, handoff timelines, and RAG pipeline tooling.",
    tags: ["Agentic AI", "RAG", "LLMOps"],
    steps: ["RESEARCH", "PROTOTYPE", "EVALUATE", "REFINE", "DEPLOY"],
  },
  {
    id: "building-roboflow",
    status: "In Progress",
    title: "Open Source Contributions (Roboflow)",
    description:
      "Working toward first contributions to Roboflow's supervision, an open-source computer vision library. Focus on reusable CV utilities and annotation tooling.",
    tags: ["Python", "Computer Vision", "Open Source"],
    steps: ["EXPLORE", "IMPLEMENT", "TEST", "PR", "MERGE"],
  },
] as const;

export type BuildingItem = (typeof BUILDING)[number];
