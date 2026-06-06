export const PROJECTS = [
  {
    id: "ludex",
    title: "Ludex",
    subtitle: "Hybrid Recommendation System",
    description:
      "A hybrid recommendation engine fusing TF-IDF content modeling with implicit-feedback collaborative filtering (ALS). Serves personalized game recommendations via anchor-based profiling, score-normalized fusion, and MMR-based re-ranking — handling cold-start users out of the box.",
    tech: "Python, Scikit-learn, Implicit ALS, Steam API",
    tags: ["Machine Learning", "Recommendation Systems", "Python"],
    github: "https://github.com/Jonathan-Jesni/Ludex",
    image: "/assets/ludex-recommendations.png",
    imageAlt: "Ludex personalized game recommendations interface",
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
    image: null,
    imageAlt: null,
    pipeline: ["PDF", "Parse", "Structure", "Render", "DOCX"],
  },
  {
    id: "webguardian",
    title: "WebGuardian",
    subtitle: "Phishing Detection System",
    description:
      "Multimodal phishing detection combining Char-CNN + LSTM (URL analysis) and MobileNetV2 (visual analysis) via late fusion. Achieves 98.73% accuracy on 3,000 real-world webpages with ~35ms inference — deployed as a production Chrome extension for real-time, on-device threat detection.",
    tech: "Python, Char-CNN + LSTM, MobileNetV2, Chrome Extension",
    tags: ["Deep Learning", "Cybersecurity", "Computer Vision"],
    github: "https://github.com/Jonathan-Jesni",
    image: "/assets/webguardian-phishing.png",
    imageAlt: "Phishing detection warning overlay",
  },
  {
    id: "synthetic-data",
    title: "Synthetic Data Object Detection",
    subtitle: "Detection Pipeline",
    description:
      "End-to-end object detection trained on zero real-world images — entirely synthetic data generated in Blender with randomized 3D scenes. YOLOv8 Nano on 640×640 renders achieves 0.997 precision, 1.000 recall, and 0.995 mAP@50, proving synthetic-only training can match real-data performance.",
    tech: "Python, Blender, YOLOv8, Ultralytics",
    tags: ["Computer Vision", "Synthetic Data", "Deep Learning"],
    github:
      "https://github.com/Jonathan-Jesni/synthetic-data-object-detection",
    image: "/assets/object-detection-main.png",
    imageAlt: "Synthetic object detection with bounding boxes",
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
