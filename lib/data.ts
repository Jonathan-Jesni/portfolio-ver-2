export const PROJECTS = [
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
    metric: "0.85 F1 · ~25% faster training",
  },
  {
    id: "synthrescue",
    title: "SynthRescue",
    subtitle: "Autonomous AI Triage & Synthetic Data Engine",
    description:
      "Autonomous AI triage and synthetic data engine. Engineered a procedural 3D Blender pipeline to automate bounding-box annotations across occluded disaster scenes. Trained a custom YOLOv8 model on ~6,115 images to achieve 96.7% precision, and deployed a full-stack dashboard (Next.js, FastAPI, GCP) using Gemini AI to translate drone telemetry into emergency reports.",
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
    metric: "96.7% precision · 6,115 imgs",
  },
  {
    id: "ludex",
    title: "Ludex",
    subtitle: "Hybrid Game Recommendation System",
    description:
      "A hybrid recommendation engine combining content-based filtering and collaborative filtering to improve relevance by ~12-18% over standalone baselines. Integrates diversity-aware re-ranking to increase catalog coverage by ~20% (reducing popularity bias) and handles cold-start user scenarios using metadata-driven fallback logic, evaluated on large-scale Steam interaction data.",
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
    metric: "+12-18% relevance · +20% coverage",
  },
  {
    id: "file-converter",
    title: "File Converter",
    subtitle: "Document Processing Engine",
    description:
      "A deterministic two-pass document conversion engine, with structural analysis separated from rendering. Handles paragraph reconstruction, list detection, heading inference, and conservative table extraction with fully explainable outputs. No OCR, no ML, fully deterministic.",
    tech: "Python, Two-Pass Architecture",
    tags: ["Python", "Document Processing", "Systems Design"],
    github: "https://github.com/Jonathan-Jesni/pdf_converter",
    images: null,
    imageAlts: null,
    pipeline: ["PDF", "Parse", "Structure", "Render", "DOCX"],
    note: "Evolving into a full document processing suite with multi-format conversion and PDF compression.",
    metric: "deterministic · no ML / OCR",
  },
] as const;


export const BUILDING = [
  {
    id: "building-converter-v2",
    status: "In Progress",
    title: "Document Processing Suite",
    description:
      "Expanding the File Converter into a full document processing system with multi-format conversion, document compression, and extended format support.",
    tags: ["Python", "Document Processing", "Pipeline"],
    steps: ["INGEST", "PARSE", "STRUCTURE", "COMPRESS", "RENDER"],
  },
  {
    id: "building-exploration",
    status: "Exploring",
    title: "New Projects",
    description:
      "Researching next areas: LLM tooling, agentic systems, and distributed systems.",
    tags: ["LLMs", "Agentic AI", "Research"],
    steps: ["RESEARCH", "PROTOTYPE", "EVALUATE", "REFINE", "DEPLOY"],
  },
] as const;

export type BuildingItem = (typeof BUILDING)[number];
