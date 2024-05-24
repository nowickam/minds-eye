let uniforms = {};

export function initShader() {
    let width = window.innerWidth;
    let height = window.innerHeight;

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
                #define POINTS 6
                #define PI 3.1415

                uniform vec2 u_resolution;
                uniform float u_time;
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
                    // uv = 0.5 * (uv + 1.);
                    uv.x *= u_resolution.x / u_resolution.y;
                    // uv.x -= 0.5;
                    ivec2 size = textureSize(u_texture1, 0);
                    uv.x *= float(size.y) / float(size.x);
                    uv.x-=0.1;


                    // Seed for the position noise        
                    vec2 seed = vec2(u_seed.x);
                    vec2 seedY = vec2(u_seed.y);
                    // vec2 seed = vec2(2.);
                    // vec2 seedY = vec2(5.);
                            
                    // Centroids
                    vec2 points[POINTS];
                    for (int i = 0; i < POINTS; i++) {
                        // points[i] = vec2(0.5+1.*(random(seed)-0.5), 0.5+1.*(random(seedY)-0.5));
                        points[i] = vec2((random(seed))*1.2-0.1, (random(seedY))*1.2-0.1);
                        seed += .4;
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
                    float w = 4.5;
                    // Size of the blob (bigger value, smaller blobs)
                    float blobSize = 18.;

                    for (int i = 0; i < POINTS; i++) {
                        // Distance squared (not sure why, eliminate negative?)
                        d = pow(distance(uv, points[i]), 1.5) * blobSize;
                    
                        float h = smoothstep(-1., 1., (m.x - d) / w);
                        m.x = mix(m.x, d, h) - h * (1. - h) * w / (.1 + 3. * w);       // distance
                        m.yz = mix(m.yz, points[i], h);// - h * (1.0 - h) * w / (.1 + 3. * w); // color
                    }
                
                    // Edge around
                    // Where the edge is
                    float rim = .5;
                    // Thickness of the edge
                    float thickness = 0.3;
                    // Intensity of the color of the edg
                    float intensity = 0.3;

                
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


                    // if(uv.x <= 10.){
                        if(color.r > 0. )
                        {

                            vec2 uvDist = distort(uv*1.5-0.25, m.x+0.2*cnoise(uv*5.), -.5, m.yz);
                            // vec3 colorDist = mix(texture(u_texture1, uvDist, -100.).rgb, texture(u_texture1, uv, -100.).rgb, smoothstep(-1., 1., m.x*1.));
                            vec3 colorDist = texture(u_texture1, uvDist, -100.).rgb;


                            vec3 colorNorm = texture(u_texture1, uv, -100.).rgb;// * pow(colorDist+0.5, vec3(1.0));

                            float Threshold = u_luminosity;
                            float Intensity = 3.5;
                            float BlurSize = 5.5;
                                
                                
                            vec3 Highlight = clamp(blur(uvDist, BlurSize)-Threshold,0.0,1.0)*1.0/(1.0-Threshold);
                                
                            colorNorm = blur(uv, 0.1);
                            // colorNorm = mix(1.0-(1.0-colorNorm)*(1.0-Highlight*Intensity), colorNorm,0.3*(0.2126*color.r+0.7152 *color.g+0.0722 * color.b)) ; //Screen Blend Mode
                            colorNorm = 1.0-(1.0-colorNorm)*(1.0-Highlight*Intensity) ; //Screen Blend Mode
                            

                            Threshold = u_luminosity*1.5;
                            Intensity = 2.0;
                            BlurSize =2.5;
                                
                                
                            vec3 Highlight1 = clamp(blur(uv, BlurSize)-Threshold,0.0,1.0)*1.0/(1.0-Threshold);
                            vec3 Highlight2 = clamp(blur(uvDist, BlurSize)-Threshold,0.0,1.0)*1.0/(1.0-Threshold);
                            Highlight = max(Highlight1, Highlight2);
                            // Highlight =  Highlight2;
                                
                            colorDist = blur(uvDist, .5);
                            colorDist = 1.0-(1.0-colorDist)*(1.0-Highlight*Intensity);

                            color = mix(colorDist, colorNorm, smoothstep(.45, 0.55 , m.x));
                            color = clamp(color, 0.0, 1.0);
                            
                    // color = mix(color, colorDist, 0.1*(color.r+color.g+color.b)/3.0);
                        }

                    // }
                    
                    color -= vec3(.1 * (random(uv) - .5));
                    // color = texture(u_texture1, uv, -100.).rgb;
                    
                    gl_FragColor = vec4(vec3(color), 1.0);
                    
                }
                `;

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
                sum += 0.2126 * imageData.data[i] + 0.7152 * imageData.data[i + 1] + 0.0722 * imageData.data[i + 2];
                // sum += (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
            }
            const luminosity = sum / (canvas2.width * canvas2.height) / 255;
            return luminosity
        }
        return 0;
    }

    window.addEventListener('resize', () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = 1.2 * height * texture.image.width / texture.image.height;
        canvas.height = height;
        uniforms.u_resolution = { value: new THREE.Vector2(canvas.width, canvas.height) };
        renderer.setSize(canvas.width, canvas.height);
        camera.aspect = canvas.width / canvas.height;
        camera.updateProjectionMatrix();
    })

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

    const IMG_N = 50;
    let imageIdx = Math.floor(hl.random() * IMG_N);
    let imageName = `img/img${imageIdx + 1}.jpg`

    let seeds = [
        [[0.32833285885863006, 0.3980765307787806]],
        [[0.6560636973008513, 0.6795940012671053]],
        [[0.4603170494083315, 0.1462087614927441]],
        [[0.7136805006302893, 0.889012842439115]],
        [[0.4455257677473128, 0.8643815747927874], [0.8935900400392711, 0.7698066832963377], [0.6723987879231572, 0.7496828695293516]],
        [[0.6504754186607897, 0.3105948055163026]],
        [[0.9206518873106688, 0.2971764684189111]],
        [[0.6367945852689445, 0.9686689290683717]],
        [[0.20646945713087916, 0.046951690223068]],
        [[0.7459108619950712, 0.2499065848533064]],

        [[0.6102684233337641, 0.2223469358868897]],
        [[0.03959637600928545, 0.6545476319734007]],
        [[0.7297876577358693, 0.770167127950117]],
        [[0.8053254645783454, 0.3387450883165002]],
        [[0.9467454061377794, 0.46340903523378074]],
        [[0.15432445984333754, 0.5587997930124402]],
        [[0.13780235615558922, 0.5260033940430731], [0.929628181271255, 0.18819714803248644], [0.8732511887792498, 0.08234454784542322], [0.9221269642002881, 0.7856447824742645]],
        [[0.4080328890122473, 0.8444403710309416]],
        [[0.09863330004736781, 0.06985626136884093]],
        [[0.23168507358059287, 0.915900404099375], [0.6567997243255377, 0.9400627431459725], [0.4453931571915746, 0.7728357678279281], [0.9910944551229477, 0.06321941502392292]],

        [[0.3905261140316725, 0.9255560406018049], [0.09156488231383264, 0.7508494099602103], [0.45258949673734605, 0.36822941852733493]],
        [[0.38095642114058137, 0.7180565698072314], [0.05570291820913553, 0.9796031159348786], [0.5941416684072465, 0.03396701882593334], [0.7043316345661879, 0.4128245492465794]],
        [[0.15793349430896342, 0.5850203726440668], [0.8508140619378537, 0.6796099622733891]],
        [[0.8728919099085033, 0.8350159963592887]],
        [[0.5830538056325167, 0.5685245105996728], [0.29165214439854026, 0.6846181869041175], [0.23551287618465722, 0.135543443961069]],
        [[0.25018332130275667, 0.48613209929317236], [0.32339573884382844, 0.4929889449849725], [0.06736665801145136, 0.5977626862004399]],
        [[0.26043068221770227, 0.6401022612117231]],
        [[0.6093976201955229, 0.999974072445184], [0.33447549119591713, 0.07704461249522865]],
        [[0.905816690530628, 0.034705331549048424]],
        [[0.8955499497242272, 0.4722629035823047]],

        [[0.027022669790312648, 0.14500897307880223]],
        [[0.7128256079740822, 0.8320034267380834], [0.9667332649696618, 0.7866610293276608], [0.08441861858591437, 0.7587458465714008]],
        [[0.9309994191862643, 0.12647131085395813], [0.4701669348869473, 0.28679443639703095]],
        [[0.13007081346586347, 0.11585103115066886], [0.12131857452914119, 0.15753548918291926], [0.8258043632376939, 0.28820256725884974]],
        [[0.8286232121754438, 0.6273797696921974], [0.7451640169601887, 0.8350478827487677]],
        [[0.8708352393005043, 0.9345545871183276]],
        [[0.31596386968158185, 0.5205329649616033]],
        [[0.9295292815659195, 0.9238962195813656]],
        [[0.7321073201019317, 0.08230220316909254]],
        [[0.04722339427098632, 0.3406276849564165], [0.5478236514609307, 0.12379633099772036]],

        [[0.9045468477997929, 0.24105747719295323]],
        [[0.7054178584367037, 0.09525544592179358], [0.4449798830319196, 0.8404604585375637], [0.8266768222674727, 0.41955716349184513], [0.9890434294939041, 0.8120847227983177]],
        [[0.5332196473609656, 0.8659843979403377], [0.17744260211475194, 0.7548813058529049]],
        [[0.04235218116082251, 0.4241534974426031], [0.9718763888813555, 0.8420425252988935]],
        [[0.7600342824589461, 0.02867449843324721], [0.8694606306962669, 0.2817639294080436], [0.14120573294349015, 0.9140734525863081]],
        [[0.27475714730098844, 0.17283937451429665], [0.7673331890255213, 0.29105078242719173], [0.20015009259805083, 0.016761314123868942]],
        [[0.026309300446882844, 0.13186983577907085], [0.9182322411797941, 0.31569141964428127]],
        [[0.4060362621676177, 0.5010116829071194], [0.24210801371373236, 0.43521934701129794]],
        [[0.2632124174851924, 0.7914227228611708], [0.8929720823653042, 0.35033005732111633], [0.7200877321884036, 0.47850534319877625], [0.3145054872147739, 0.5472655447665602]],
        [[0.812701468123123, 0.8418590459041297], [0.14156049233861268, 0.9860402944032103], [0.4660054880660027, 0.22782027348876], [0.007607022067531943, 0.09000999270938337], [0.1178663510363549, 0.4335374783258885]]

    ]

    let canvas, renderer, texture;

    // const texture = new THREE.TextureLoader().load(url);
    const loader = new THREE.TextureLoader()
    loader.load(
        // url,
        imageName,
        function (loadedTexture) {
            texture = loadedTexture;
            canvas = document.getElementById('c');
            canvas.width = 1.2 * height * texture.image.width / texture.image.height;
            canvas.height = height;

            renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas, alpha: true });
            renderer.setClearColor(0x000000, 0);
            renderer.setSize(canvas.width, canvas.height)

            camera.aspect = canvas.width / canvas.height;

            let x = [hl.random(), hl.random()];
            // x = [0.2632124174851924, 0.7914227228611708]
            // x = [0.8929720823653042, 0.35033005732111633]
            // x = [0.7200877321884036, 0.47850534319877625]
            // x = [0.3145054872147739, 0.5472655447665602]

            // console.log(`[${x[0]}, ${x[1]}]`);

            let seedImgVar = Math.floor(hl.random() * seeds[imageIdx].length);

            let lum = getBrightness(texture);
            uniforms = {
                u_resolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
                u_time: { value: time },
                u_texture1: { value: texture },
                u_luminosity: { value: lum },
                u_seed: { value: new THREE.Vector2(seeds[imageIdx][seedImgVar][0], seeds[imageIdx][seedImgVar][1]) }
                // u_seed: { value: new THREE.Vector2(x[0], x[1]) }
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

initShader();