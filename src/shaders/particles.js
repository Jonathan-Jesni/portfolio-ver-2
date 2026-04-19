/**
 * Custom GLSL shaders for the particle system.
 *
 * Vertex shader:
 *   - Takes particle positions from BufferGeometry position attribute
 *   - Applies mouse-driven displacement: particles scatter violently
 *     near the cursor then fluidly reform
 *   - Outputs point size based on camera distance + glow factor
 *
 * Fragment shader:
 *   - Renders soft circular glowing particles
 *   - Color is driven by distance from center for a neon glow effect
 */

export const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uScrollProgress;
  uniform float uMouseIntensity;

  // 'position' is the built-in attribute from BufferGeometry
  attribute float aScale;
  attribute float aSpeed;

  varying float vDistToMouse;
  varying float vDepth;
  varying float vScale;

  //
  // Simplex-style 3D noise (Ashima Arts)
  //
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    // Base position from geometry attribute
    vec3 pos = position;

    // Ambient drift noise
    float noiseX = snoise(vec3(pos.x * 0.3, pos.y * 0.3, uTime * 0.15 + aSpeed));
    float noiseY = snoise(vec3(pos.y * 0.3, pos.z * 0.3, uTime * 0.12 + aSpeed * 1.3));
    float noiseZ = snoise(vec3(pos.z * 0.3, pos.x * 0.3, uTime * 0.1 + aSpeed * 0.7));
    pos += vec3(noiseX, noiseY, noiseZ) * 0.8;

    // ── Mouse interaction: violent scatter + fluid reform ──
    // Convert mouse from NDC to world-space approximate
    vec3 mouseWorld = vec3(uMouse.x * 12.0, uMouse.y * 8.0, 0.0);
    float distToMouse = length(pos.xy - mouseWorld.xy);

    // Repulsion radius and strength
    float repulsionRadius = 5.0;
    float repulsionStrength = uMouseIntensity * 18.0;
    float influence = smoothstep(repulsionRadius, 0.0, distToMouse);

    // Scatter direction away from mouse
    vec2 scatterDir = normalize(pos.xy - mouseWorld.xy + vec2(0.001));

    // Violent scatter with turbulence
    float turbulence = snoise(vec3(pos.xy * 2.0, uTime * 3.0)) * 0.5;
    pos.x += scatterDir.x * influence * repulsionStrength * (1.0 + turbulence);
    pos.y += scatterDir.y * influence * repulsionStrength * (1.0 + turbulence);
    pos.z += influence * repulsionStrength * 0.4 * sin(uTime * 5.0 + distToMouse);

    // Fluid vortex swirl near mouse
    float swirlAngle = influence * 3.14159 * 2.0 * uMouseIntensity;
    vec2 relPos = pos.xy - mouseWorld.xy;
    float cosA = cos(swirlAngle * 0.3);
    float sinA = sin(swirlAngle * 0.3);
    pos.xy = mouseWorld.xy + vec2(
      relPos.x * cosA - relPos.y * sinA,
      relPos.x * sinA + relPos.y * cosA
    );

    vDistToMouse = distToMouse;
    vDepth = pos.z;
    vScale = aScale;

    // Camera-relative position
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // Point size: closer = bigger, with scale attribute
    float size = aScale * (450.0 / -mvPosition.z);
    size = max(size, 2.0);

    // Brighten near mouse
    size *= 1.0 + influence * 2.0;

    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uMouseIntensity;

  varying float vDistToMouse;
  varying float vDepth;
  varying float vScale;

  void main() {
    // Circular particle mask
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Soft glow falloff
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha = pow(alpha, 1.5);

    // Base color: cyan core → purple edge
    vec3 coreColor = vec3(0.0, 0.94, 1.0);   // #00f0ff
    vec3 edgeColor = vec3(0.66, 0.33, 0.97);  // #a855f7
    vec3 hotColor = vec3(1.0, 0.42, 0.61);    // #ff6b9d

    // Color shifts based on proximity to mouse
    float mouseProximity = smoothstep(5.0, 0.0, vDistToMouse) * uMouseIntensity;
    vec3 color = mix(coreColor, edgeColor, dist * 2.0);
    color = mix(color, hotColor, mouseProximity * 0.7);

    // Pulsing glow
    float pulse = sin(uTime * 2.0 + vDepth * 0.5) * 0.15 + 0.85;
    alpha *= pulse;

    // Extra bloom for close particles
    float bloom = mouseProximity * 0.6;
    alpha = min(alpha + bloom, 1.0);

    // Depth-based fade
    float depthFade = smoothstep(-60.0, 0.0, vDepth);
    alpha *= mix(0.2, 1.0, depthFade);

    gl_FragColor = vec4(color, alpha);
  }
`;
