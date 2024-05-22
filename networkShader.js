let uniforms = {};

export function initShader(width, height, nodes, links) {
    const canvas = document.getElementById('c');
    canvas.width = width;
    canvas.height = height;

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(width, height)

    const camera = new THREE.OrthographicCamera(
        -1, // left
        1, // right
        1, // top
        -1, // bottom
        -1, // near,
        1, // far
    );

    const scene = new THREE.Scene();
    const plane = new THREE.PlaneGeometry(2, 2);

    const vertexShader = /* glsl */ `
                varying vec3 vUv;
                void main() {
                    gl_Position = vec4(position, 1.0 );
                }
    `

    const fragmentShader = /* glsl */ `
                #define POINTS 4
                #define PI 3.1415

                uniform vec2 u_resolution;
                uniform float u_time;
                uniform vec4 u_nodes[POINTS];
                uniform vec2 u_seed;

                uniform sampler2D u_texture1;
                uniform sampler2D u_texture2;
                uniform float u_luminosity;
                
                float random(vec2 co) {
                    return fract(sin((mod(dot(co, vec2(12.9898, 78.233)), 2.*PI))) * 43758.5453);
                }


                // // https://thebookofshaders.com/11/
                float noise (in vec2 st) {
                    vec2 i = floor(st);
                    vec2 f = fract(st);

                    // Four corners in 2D of a tile
                    float a = random(i);
                    float b = random(i + vec2(1.0, 0.0));
                    float c = random(i + vec2(0.0, 1.0));
                    float d = random(i + vec2(1.0, 1.0));

                    // Smooth Interpolation

                    // Cubic Hermine Curve.  Same as SmoothStep()
                    vec2 u = f*f*(3.0-2.0*f);
                    // u = smoothstep(0.,1.,f);

                    // Mix 4 coorners percentages
                    return mix(a, b, u.x) +
                            (c - a)* u.y * (1.0 - u.x) +
                            (d - b) * u.x * u.y;
                }

                //
// GLSL textureless classic 2D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-08-22
//
// Many thanks to Ian McEwan of Ashima Arts for the
// ideas for permutation and gradient selection.
//
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license. See LICENSE file.
// https://github.com/stegu/webgl-noise
//

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+10.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec2 fade(vec2 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise
float cnoise(vec2 P)
{
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod289(Pi); // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;

  vec4 i = permute(permute(ix) + iy);

  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0 ;
  vec4 gy = abs(gx) - 0.5 ;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;

  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);

  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;  
  g01 *= norm.y;  
  g10 *= norm.z;  
  g11 *= norm.w;  

  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));

  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

// Classic Perlin noise, periodic variant
float pnoise(vec2 P, vec2 rep)
{
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, rep.xyxy); // To create noise with explicit period
  Pi = mod289(Pi);        // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;

  vec4 i = permute(permute(ix) + iy);

  vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0 ;
  vec4 gy = abs(gx) - 0.5 ;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;

  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);

  vec4 norm = taylorInvSqrt(vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)));
  g00 *= norm.x;  
  g01 *= norm.y;  
  g10 *= norm.z;  
  g11 *= norm.w;  

  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));

  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}


                // float smoothNoise(vec2 uv){
                //     float f = noise( 32.0*uv );
                //     mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );
                //     f  = 0.5000*noise( uv ); uv = m*uv;
                //     f += 0.2500*noise( uv ); uv = m*uv;
                //     f += 0.1250*noise( uv ); uv = m*uv;
                //     f += 0.0625*noise( uv ); uv = m*uv;

                //     return f;
                // }

                float map(float value, float min1, float max1, float min2, float max2) {
                    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
                }

                // // fisheye distortion
                vec2 distort(vec2 point, float radius, float intensity, vec2 center)
                {
                    // pos = 0.5 * (pos + 1.0);
                    // pos += 0.1;
                    vec2 pos = point - center;
                    float theta = atan(pos.y, pos.x);
                    // float theta = atan(pos.y, pos.x);
                    // radius = pow(radius, intensity);
                    radius *= intensity;
                    pos.x = radius * cos(theta);
                    pos.y = radius * sin(theta);

                    return point + pos;

                    // return 0.5 * (pos + 1.0);
                    // return 2. * pos - 1.0;
                }

                vec3 blur(vec2 uv, float size){
                    vec3 color = vec3(0.);
                    vec2 offset = vec2(1.0) / u_resolution;
                    for (int i = -1; i <= 1; i++) {
                        for (int j = -1; j <= 1; j++) {
                            color += texture(u_texture1, uv + vec2(i, j) * offset, size).rgb;
                        }
                    }
                    return color / 9.0;
                }
                
                
                void main() {
                    // Normalized pixel coordinates (from 0 to 1)
                    vec2 uv = gl_FragCoord.xy / u_resolution;
                    // uv = 2.0 * uv - 1.0;
                    uv.x *= u_resolution.x / u_resolution.y;
                    // uv = 0.5 * (uv + 1.);
                    ivec2 size = textureSize(u_texture1, 0);
                    uv.x *= float(size.y) / float(size.x);


                    // Seed for the position noise        
                    vec2 seed = vec2(u_seed.x);
                    vec2 seedY = vec2(u_seed.y);
                    // vec2 seed = vec2(2.);
                    // vec2 seedY = vec2(5.);
                            
                    // Centroids
                    vec2 points[POINTS];
                    for (int i = 0; i < POINTS; i++) {
                        points[i] = vec2(0.5+0.8*(random(seed)-0.5), 0.5+0.8*(random(seedY)-0.5));
                        // points[i] = vec2((random(seed)-0.5), (random(seedY)-0.5));
                        // points[i] = vec2(u_nodes[i].xy);
                        seed += 2.;
                        seedY += .3;
                    }
                
                    // https://www.shadertoy.com/view/ldB3zc
                    // Worley noise with antialiasing (take distance to all centroids proportionally, i think)
                    // distance to the closest centroid
                    float d;

                    vec2 center = vec2(0.0);
                    for (int j = 0; j < POINTS; j++) {
                        center += points[j] / float(POINTS);
                    }
                    // Distance, color rgb
                    vec4 m = vec4(0.1, center, 0.0);

                    // Rate of coagulation around the centroids (bigger value, less coagulation), smoothness
                    float w = 4.;
                    // Size of the blob (bigger value, smaller blobs)
                    float blobSize = 20.;

                    for (int i = 0; i < POINTS; i++) {
                        // Distance squared (not sure why, eliminate negative?)
                        d = pow(distance(uv, points[i]), 1.5) * blobSize;
                    
                        float h = smoothstep(-1., 1., (m.x - d) / w);
                        m.x = mix(m.x, d, h) - h * (1. - h) * w / (.1 + 3. * w);       // distance
                        m.yz = mix(m.yz, points[i], h);// - h * (1.0 - h) * w / (.1 + 3. * w); // color
                    }

                    // Step gradient; 100/100 clean; 80/100 dirty
                    float n = noise(uv*80.);
                    float minDistFlat = floor((m.x) * 10. ) / 10.;
                
                    // Edge around
                    // Where the edge is
                    float rim = .5;
                    // Thickness of the edge
                    float thickness = 0.1;
                    // Intensity of the color of the edg
                    float intensity = 0.;
                
                    minDistFlat -= intensity * (smoothstep(rim - thickness, rim, m.x) -
                                                smoothstep(rim, rim + thickness, m.x));
                    minDistFlat -= 0.05 * (smoothstep(0. - thickness, 0., m.x) -
                                        smoothstep(0., 0. + thickness, m.x));
                
                    m.x -= intensity * (smoothstep(rim - thickness, rim, m.x) -
                                        smoothstep(rim, rim + thickness, m.x));

                    vec3 color = vec3(1.);

                    // for (int i = 0; i < POINTS; i++) {
                    //     if(length(uv - points[i]) < 0.01) {
                    //         color.rgb = vec3(0.,0., 0.);
                    //     }
                    // }

                    // if(length(uv - m.yz) < 0.01) {
                    //         color.rgb = vec3(0.,0.5,0.);
                    // }
                    // if(length(uv - center) < 0.1) {
                    //         color.rgb = vec3(0.,0.5,0.0);
                    // }
                    
                    // use m.x as a radius for the fisheye distortion


                    if(uv.x <= 1.){
                        if(color.r > 0. )
                        {

                            vec2 uvDist = distort(uv, m.x+0.1*cnoise(uv*5.), -.7, m.yz);
                            vec3 colorDist = mix(texture(u_texture1, uvDist, -100.).rgb, texture(u_texture1, uv, -100.).rgb, smoothstep(1., -1., m.x*5.));

                            vec3 colorNorm = texture(u_texture1, uv, -100.).rgb;// * pow(colorDist+0.5, vec3(1.0));

                            float Threshold = u_luminosity;
                            float Intensity = 4.0;
                            float BlurSize = 5.0;
                                
                                
                            vec3 Highlight = clamp(blur(uv, BlurSize)-Threshold,0.0,1.0)*1.0/(1.0-Threshold);
                                
                            colorNorm = blur(uv, 0.1);
                            colorNorm = 1.0-(1.0-colorNorm)*(1.0-Highlight*Intensity); //Screen Blend Mode
                            

                            Threshold = u_luminosity*1.5;
                            Intensity = 2.0;
                            BlurSize = 3.0;
                                
                                
                            vec3 Highlight1 = clamp(blur(uv, BlurSize)-Threshold,0.0,1.0)*1.0/(1.0-Threshold);
                            vec3 Highlight2 = clamp(blur(uvDist, BlurSize)-Threshold,0.0,1.0)*1.0/(1.0-Threshold);
                            Highlight = max(Highlight1, Highlight2);
                                
                            colorDist = blur(uvDist, .5);
                            colorDist = 1.0-(1.0-colorDist)*(1.0-Highlight*Intensity);//Screen Blend Mode

                            color = mix(colorDist, colorNorm, smoothstep(.45, 0.55 , m.x));

                        }

                    }
                    
                    color -= vec3(.1 * (random(uv) - .5));
                    gl_FragColor = vec4(vec3(color), 1.0);
                    
                }
                `;

    // let data = objects.filter((d) => {
    //     if (d.classifications.length > 0 && d.classifications[0].en === "painting") {
    //         let result = true;
    //         // result = d.keywords.filter((d) => {
    //         //     if (d.en === "Kalevala") {
    //         //         return true;
    //         //     }
    //         //     return false;
    //         // }).length > 0 ? true : false;
    //         return result;

    //     }
    //     return false;
    // });

    // let idx = Math.floor(Math.random() * data.length);
    // console.log(data[idx])
    // let url = data[idx].multimedia[0].jpg['2000'];

    // console.log(data)

    function getBrightness(texture) {
        if (texture) {
            const canvas2 = document.createElement('canvas');
            canvas2.width = texture.image.width;
            canvas2.height = texture.image.height;
            const context = canvas2.getContext('2d');
            context.drawImage(texture.image, 0, 0);
            const imageData = context.getImageData(0, 0, canvas2.width, canvas2.height);
            let sum = 0;
            for (let i = 0; i < imageData.data.length; i += 4) {
                // luminosity
                sum += 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
                // sum += (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
            }
            const luminosity = sum / (canvas2.width * canvas2.height) / 255;
            return luminosity
        }
        return 0;
    }

    let time = 0;
    let fps = 1;

    function render(time) {
        if (fps === 1) {
            uniforms.u_time.value = -time / 10000;
            fps = 0;
        }
        fps++;
        renderer.render(scene, camera);

        requestAnimationFrame(render);

    }

    const IMG_N = 75;
    let imageName = `img/img${Math.floor(Math.random() * IMG_N + 1)}.jpg`

    // const texture = new THREE.TextureLoader().load(url);
    const loader = new THREE.TextureLoader()
    loader.load(
        // url,
        imageName,
        function (texture) {
            let lum = getBrightness(texture);
            uniforms = {
                u_resolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
                u_time: { value: time },
                u_nodes: { value: nodes },
                u_texture1: { value: texture },
                u_luminosity: { value: lum },
                u_seed: { value: new THREE.Vector2(Math.random(), Math.random()) }
            };

            const material = new THREE.ShaderMaterial({
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                uniforms: uniforms,
                transparent: true,
            });
            scene.add(new THREE.Mesh(plane, material));
            requestAnimationFrame(render);
        }
    );

}

export function updateShader(nodes, links) {
    if (uniforms.u_nodes)
        uniforms.u_nodes.value = nodes;

}