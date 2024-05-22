let uniforms = {}

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
                #define POINTS 1
                #define LINKS 490
                #define COLORS 5
                #define PI 3.1415

                uniform vec2 u_resolution;
                uniform float u_time;
                uniform vec4 u_nodes[POINTS];
                uniform vec4 u_links[LINKS];

                uniform sampler2D u_texture1;
                uniform sampler2D u_texture2;
                
                float random(vec2 co) {
                    return fract(sin((mod(dot(co, vec2(12.9898, 78.233)), 2.*PI))) * 43758.5453);
                }


                // https://thebookofshaders.com/11/
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

                float map(float value, float min1, float max1, float min2, float max2) {
                    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
                }

                int getColorIdx(vec2 idx, int chromPos){
                    // random decreased res (bigger values of the final multiplier mess the color sequence connection with js)
                    float val = 10.*fract(sin(dot(vec2(idx.x+float(chromPos),idx.y+float(chromPos)), vec2(11.28, 78.23)))* 43.83);
                    float valMod = mod(val, float(COLORS));
                    float valModFloor = floor(valMod);
                            
                    return int(valModFloor);
                }

                float line( in vec2 p, in vec2 a, in vec2 b ){
                    // line vector
                    vec2 ba = b-a;
                    // vector from the pixel to line
                    vec2 pa = p-a;
                    // computing the projection of pa onto ba (i.e. h*ba; by using dot product)
                    // if the projection is outside the line segment (h<0 or h>1), the closest point will be one of the line's ends
                    // if the projection is inside the line segment (0<h<1), the closest point will be the projection itself
                    float h =clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
                    // distance from the pixel to the line
                    float d =  length(pa-h*ba);
                    // return the antialiased line
                    return 1. - exp(-50.0*(d - 0.001))* 0.8;
                }

                // fisheye distortion
                vec2 distort(vec2 pos, float radius, float intensity)
                {
                    // pos = 0.5 * (pos + 1.0);
                    pos += 0.1;
                    // float theta = atan(pos.y, pos.x)/3.1415;
                    float theta = atan(pos.y, pos.x);
                    radius = pow(radius, intensity);
                    pos.x = radius * cos(theta);
                    pos.y = radius * sin(theta);

                    return pos;

                    // return 0.5 * (pos + 1.0);
                    // return 2. * pos - 1.0;
                }
                
                void main() {
                    // Normalized pixel coordinates (from 0 to 1)
                    vec2 uv = gl_FragCoord.xy / u_resolution;
                    // uv = 2.0 * uv - 1.0;
                    uv.x *= u_resolution.x / u_resolution.y;
                    // uv = 0.5 * (uv + 1.);

                    // Seed for the position noise        
                    vec2 seed = vec2(10.);
                    vec2 seedY = vec2(1.);
                
                    vec3 colors[COLORS+1];
                    // colors[0] = vec3(214., 189., 232.) / 255.;
                    colors[0] = vec3(114., 89., 132.) / 255.;
                    colors[1] = vec3(59., 43., 89.) / 255.;
                    colors[2] = vec3(82., 0., 211.) / 255.;
                    colors[3] = vec3(115., 133., 255.) / 255.;
                    colors[4] = vec3(137., 184., 196.) / 255.;
                    colors[5] = vec3(188., 191., 196.) / 255.;
                
                    // Centroids
                    vec2 points[POINTS];
                    for (int i = 0; i < POINTS; i++) {
                        // points[i] = vec2(2.*noise(seed),float(i+1) / float(POINTS)); //map(float(i) / float(POINTS), 0., 1., 0., .915));
                        points[i] = vec2(noise(seed), map(noise(seedY), 0., 1., 0., .7));
                        //   points[i] = vec2(random(vec2(seed.x), random(seed.y));
                        seed += .5;
                        seedY += .2;
                        // points[i] = vec2(u_nodes[i].xy);
                    }

                    // draw the network's links by computing distance to all lines
                    float lines = 1.;

                    for(int i = 0; i < 200; i++){
                        vec2 a = u_links[i].xy;
                        vec2 b = u_links[i].zw;
                        lines *= (line(uv.xy, a, b));
                    }
                
                    // https://www.shadertoy.com/view/ldB3zc
                    // Worley noise with antialiasing (take distance to all centroids proportionally, i think)
                    // distance to the closest centroid
                    float d;
                    // Distance, color rgb
                    vec4 m = vec4(8., 0.0, 0.0, 0.0);
                    // Rate of coagulation around the centroids (bigger value, less coagulation), smoothness
                    float w = 10.;
                    // Size of the blob (bigger value, smaller blobs)
                    float blobSize = 10.;
                    // Seed for the color noise
                    seed = vec2(10., 2.0);
                    
                    for (int i = 0; i < POINTS; i++) {
                        // Aistance squared (not sure why)
                        d = pow(distance(uv, points[i]), 2.) * blobSize;
                        // Add the distance to all lines
                        // d += .1*lines;
                        // In
                        // int colorIdx = getColorIdx(seed, i);
                        int colorIdx = int(u_nodes[i].w);

                        seed += vec2(0.15, 0.3);
                    
                        vec3 col = 1. - colors[colorIdx]; // + 0.05 * vec3(random(vec2(seed.x, seed.y)), random(vec2(seed.x+0.03, seed.y+0.04)), random(vec2(seed.x+0.05, seed.y+0.03)));
                        float h = smoothstep(-1., 1., (m.x - d) / w);
                        m.x = mix(m.x, d, h) - h * (1. - h) * w / (.1 + 3. * w);       // distance
                        m.yzw = mix(m.yzw, col, h) - h * (1.0 - h) * w / (.1 + 3. * w); // color
                    }
                    // same as adding the lines in the distance in loop above
                    // m.x += 0.9* lines;

                    // Step gradient; 100/100 clean; 80/100 dirty
                    float minDistFlat = floor(m.x * 800.) / 600.;
                
                    // Edge around
                    // Where the edge is
                    float rim = .005;
                    // Thickness of the edge
                    float thickness = .005;
                    // Intensity of the color of the edge
                    float intensity = .05;
                
                    minDistFlat -= intensity * (smoothstep(rim - thickness, rim, m.x) -
                                                smoothstep(rim, rim + thickness, m.x));
                    minDistFlat -= 0.05 * (smoothstep(0. - thickness, 0., m.x) -
                                        smoothstep(0., 0. + thickness, m.x));
                
                    // m.x -= intensity * (smoothstep(rim - thickness, rim, m.x) -
                    //                     smoothstep(rim, rim + thickness, m.x));

                    // use m.x as a radius for the fisheye distortion
                    ivec2 size = textureSize(u_texture1, 0);
                    uv.x *= float(size.y) / float(size.x);
                    // uv = distort(uv, m.x+(0.01*(noise(50.*uv)-0.5))+random(seed), -.45);
                    // uv = distort(uv, m.x, -0.1);
                    uv = distort(uv, m.x, -0.45);
                    vec4 color = texture(u_texture1, uv);
                    
                
                    // vec3 color = vec3(1.);
                
                    // // color * distance mask
                    // color -= m.yzw * (1. - 15. * vec3(minDistFlat));

                    // // There is a chromosome in the tile and clean the distant background
                    // // if(m.x < 100.*rim)
                    // // {
                    //     //   Add grain
                    //     // color -= vec3(.25 * (noise(20.0*uv) - .5));
                        color.rgb -= vec3(.1 * (random(uv) - .5));

                    //     float alpha = smoothstep(.9, 0.4, color.r);
                    //     // alpha -= .55;
                    //     alpha = 1.0;

                        // color = vec3(lines);
                        gl_FragColor = vec4(color);
                    // }
                    
                }
                `;

    let time = 0;
    const texture = new THREE.TextureLoader().load("img/women.jpg");

    const uniforms = {
        u_resolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
        u_time: { value: time },
        // u_nodes: { value: nodes },
        // u_links: { value: links },
        u_texture1: { value: texture },
        u_texture2: { value: texture }
    };

    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms,
        transparent: true,
    });
    scene.add(new THREE.Mesh(plane, material));

    function render(time) {
        time *= 0.001;
        uniforms.u_time.value = time;

        renderer.render(scene, camera);

        requestAnimationFrame(render);

    }

    requestAnimationFrame(render);
}

export function updateShader(nodes) {
    uniforms.u_nodes.value = nodes;

}