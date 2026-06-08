export const PROJECTS = [
  {
    id: "double-unet",
    title: "Modified Double U-Net",
    subtitle: "Medical Image Segmentation",
    description:
      "Dual-stacked U-Net for 3-class medical image segmentation (Background, Benign, Malignant). Uses an Ensemble Encoder fusing VGG-19, DenseNet-121, and Xception backbones with Softmax-based Attention Gates to route spatial cues. Optimized via AMP and a combined Cross-Entropy & Dice loss to handle class imbalance, achieving a ~0.85 Validation F1-Score and accelerating training by ~25%.",
    tech: "PyTorch, VGG-19, DenseNet-121, Xception, Deep Learning",
    tags: ["Deep Learning", "Medical Imaging", "Computer Vision"],
    github: "https://github.com/Jonathan-Jesni",
    images: ["/assets/webguardian-phishing.png", "/assets/webguardian-safe.png"],
    imageAlts: ["Phishing detection warning overlay", "WebGuardian safe browsing mode"],
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
      "https://github.com/Jonathan-Jesni/synthetic-data-object-detection",
    images: ["/assets/object-detection-main.png", "/assets/object-detection-alt.png"],
    imageAlts: ["SynthRescue object detection with bounding boxes", "Alternative view of synthetic disaster environment detection"],
  },
  {
    id: "ludex",
    title: "Ludex",
    subtitle: "Hybrid Game Recommendation System",
    description:
      "A hybrid recommendation engine combining content-based filtering and collaborative filtering to improve relevance by ~12–18% over standalone baselines. Integrates diversity-aware re-ranking to increase catalog coverage by ~20% (reducing popularity bias) and handles cold-start user scenarios using metadata-driven fallback logic, evaluated on large-scale Steam interaction data.",
    tech: "Python, Scikit-learn, Implicit ALS, Steam API",
    tags: ["Machine Learning", "Recommendation Systems", "Python"],
    github: "https://github.com/Jonathan-Jesni/Ludex",
    images: ["/assets/ludex-login.png", "/assets/ludex-recommendations.png"],
    imageAlts: ["Ludex login interface", "Ludex personalized game recommendations interface"],
  },
  {
    id: "file-converter",
    title: "File Converter",
    subtitle: "Document Processing Engine",
    description:
      "A deterministic two-pass document conversion engine — structural analysis separated from rendering. Handles paragraph reconstruction, list detection, heading inference, and conservative table extraction with fully explainable outputs. No OCR, no ML, fully deterministic.",
    tech: "Python, Two-Pass Architecture",
    tags: ["Python", "Document Processing", "Systems Design"],
    github: "https://github.com/Jonathan-Jesni/pdf_converter",
    images: null,
    imageAlts: null,
    pipeline: ["PDF", "Parse", "Structure", "Render", "DOCX"],
    note: "Evolving into a full document processing suite with multi-format conversion and PDF compression.",
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
      "Researching next areas — interested in LLM tooling, automated security auditing, and distributed systems.",
    tags: ["LLMs", "Security", "Research"],
    steps: ["RESEARCH", "PROTOTYPE", "EVALUATE", "REFINE", "DEPLOY"],
  },
] as const;

export type BuildingItem = (typeof BUILDING)[number];
