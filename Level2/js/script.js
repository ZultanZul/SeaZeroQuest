"use strict";

var Colors = {
	white:0xd8d0d1,
	grey:0xcccccc,
	darkGrey: 0x7c7c7c,
	lightGreen: 0x8eafa6,
	yellow: 0xffd342,
	brown: 0x715337,
	lightBrown: 0x725f4c,
	red: 0xdf3636,
	blue: 0x307ddd,
	orange: 0xDB7525,
	green: 0x28b736,
	brass: 0xbca345,
};

var verShader = `
#define SCALE 50.0

varying vec2 vUv;

uniform float uTime;

float calculateSurface(float x, float z) {
    float y = 0.0;
    y += sin(x * 2.8 / SCALE + uTime * 1.5);
    y += sin(z * 2.45 / SCALE + uTime * 1.7);
    return y;
}

void main() {
    vUv = uv;
    vec3 pos = position;
    
    float strength = 1.0;
    pos.y += strength * calculateSurface(pos.x, pos.z);
    pos.y -= strength * calculateSurface(0.0, 0.5);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.1);

}  
`;

var fragShader = `
varying vec2 vUv;

uniform sampler2D uMap;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;

void main() {

    vec2 uv = vUv * 50.0 + vec2(uTime * -0.05);

    uv.y += 0.01 * (sin(uv.x * 3.5 + uTime * 0.35) + sin(uv.x * 4.8 + uTime * 1.05) + sin(uv.x * 7.3 + uTime * 0.45)) / 3.0;
    uv.x += 0.12 * (sin(uv.y * 4.0 + uTime * 0.5) + sin(uv.y * 6.8 + uTime * 0.75) + sin(uv.y * 11.3 + uTime * 0.2)) / 3.0;
    uv.y += 0.12 * (sin(uv.x * 4.2 + uTime * 0.64) + sin(uv.x * 6.3 + uTime * 1.65) + sin(uv.x * 8.2 + uTime * 0.45)) / 3.0;

    vec4 tex1 = texture2D(uMap, uv * 1.0);
    vec4 tex2 = texture2D(uMap, uv * 1.5 + vec2(0.2));

    vec3 blue = uColor;

    gl_FragColor = vec4(blue + vec3(tex1.a * 0.4 - tex2.a * 0.02), 1.0);
    gl_FragColor.a = 0.8;

    #ifdef USE_FOG
          #ifdef USE_LOGDEPTHBUF_EXT
              float depth = gl_FragDepthEXT / gl_FragCoord.w;
          #else
              float depth = gl_FragCoord.z / gl_FragCoord.w;
          #endif
          float fogFactor = smoothstep( fogNear, fogFar, depth );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
     #endif
}
`;


window.addEventListener('load', init, false);

var scene,
		camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH,
		renderer, container, controls, particleSystem;

var keyboard = new THREEx.KeyboardState();
var clock = new THREE.Clock();



var isMobile = /iPhone|Android/i.test(navigator.userAgent);


function createScene() {

	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	scene = new THREE.Scene();

	scene.fog = new THREE.Fog (0x4ca7e6, 400, 800); 

	var axis = new THREE.AxisHelper(30);
	axis.position.set(0,5,0);
	//scene.add(axis);

	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 4000;


	//Build Camera

	// camera = new THREE.PerspectiveCamera(
	// 	fieldOfView,
	// 	aspectRatio,
	// 	nearPlane,
	// 	farPlane
	// 	);

	// camera.position.set(0,30,150);

	renderer = new THREE.WebGLRenderer({ 
		alpha: true, 
		antialias: true 
	});

	// controls = new THREE.OrbitControls(camera, renderer.domElement);

	renderer.setSize(WIDTH, HEIGHT);
	renderer.shadowMap.enabled = true;
	
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	container = document.getElementById('canvas');
	container.appendChild(renderer.domElement);
	window.addEventListener('resize', handleWindowResize, false);
}

function handleWindowResize() {
	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	renderer.setSize(WIDTH, HEIGHT);
	camera.aspect = WIDTH / HEIGHT;
	camera.updateProjectionMatrix();
}

var hemisphereLight, shadowLight;

function createLights() {
	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, 1)
	scene.add(hemisphereLight);  

	shadowLight = new THREE.DirectionalLight(0xbfe0f8, .8);

	shadowLight.position.set(-300,650,350);
	shadowLight.castShadow = true;
	shadowLight.shadow.camera.left = -700;
	shadowLight.shadow.camera.right = 700;
	shadowLight.shadow.camera.top = 500;
	shadowLight.shadow.camera.bottom = -500;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;
	shadowLight.shadow.mapSize.width = 2056;
	shadowLight.shadow.mapSize.height = 2056;

	scene.add(shadowLight);
}

var Sea = function() {
	
	this.mesh = new THREE.Object3D();

	var geomWaves = new THREE.PlaneBufferGeometry(2000, 2000, 500, 500);
	geomWaves.rotateX(-Math.PI / 2);

	this.uniforms = {
        uMap: {type: 't', value: null},
        uTime: {type: 'f', value: 0},
        uColor: {type: 'f', value: new THREE.Color('#307ddd')},
	    fogColor:    { type: "c", value: scene.fog.color },
	    fogNear:     { type: "f", value: scene.fog.near },
	    fogFar:      { type: "f", value: scene.fog.far }
    };

	var shader = new THREE.ShaderMaterial({

	    uniforms: this.uniforms,
	    vertexShader: verShader,
	    fragmentShader: fragShader,
	    side: THREE.DoubleSide,
	    fog: true,
	    transparent:true,
	});

    var textureLoader = new THREE.TextureLoader();
    textureLoader.load('images/water-shader.png', function (texture) {
        shader.uniforms.uMap.value = texture;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    });
	
	this.mesh = new THREE.Mesh(geomWaves, shader);

	var geomSeaBed = new THREE.PlaneBufferGeometry(2000, 2000, 5, 5);
	geomSeaBed.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	var matWaves = new THREE.MeshPhongMaterial( {
		color:0x307ddd,
		shading:THREE.SmoothShading,
	});
	var seaBed = new THREE.Mesh(geomSeaBed, matWaves);
	seaBed.position.set(0,-10,0);
	seaBed.castShadow = false;
	seaBed.receiveShadow = true;
	this.mesh.add(seaBed);
}


function initSkybox(){

	var urls = [
		'images/skybox/sky_pos_x.png',
		'images/skybox/sky_neg_x.png',
		'images/skybox/sky_pos_y.png',
		'images/skybox/sky_neg_y.png',
		'images/skybox/sky_neg_z.png',
		'images/skybox/sky_pos_z.png'
	];
	
	var reflectionCube = new THREE.CubeTextureLoader().load( urls );
	reflectionCube.format = THREE.RGBFormat;
	
	var shader = THREE.ShaderLib[ "cube" ];
	shader.uniforms[ "tCube" ].value = reflectionCube;
	
	var material = new THREE.ShaderMaterial( {
	
		fragmentShader: shader.fragmentShader,
		vertexShader: shader.vertexShader,
		uniforms: shader.uniforms,
		depthWrite: false,
		side: THREE.BackSide
		
	} ), skyBox = new THREE.Mesh( new THREE.BoxGeometry( 4000, 2000, 4000 ), material );
	
	skyBox.position.set(0,0,0);
	scene.add( skyBox );
}

function DesertIsland(){
	this.mesh = new THREE.Object3D();
	var island = new THREE.Group();

	var matYellow = new THREE.MeshPhongMaterial({color:Colors.yellow, shading:THREE.FlatShading, wireframe:false});
	var matGrey = new THREE.MeshPhongMaterial({color:Colors.darkGrey, shading:THREE.SmoothShading, wireframe:false});
	var matBrown = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.SmoothShading, wireframe:false});
	var matGreen = new THREE.MeshPhongMaterial({color:Colors.green, shading:THREE.FlatShading, wireframe:false});

	//Sandbanks
	var geomSandBanks = new THREE.Geometry();

	var geomSandBank = new THREE.SphereGeometry( 150, 10, 10 );
	var sandBank = new THREE.Mesh( geomSandBank, matYellow );
	sandBank.scale.set(1,0.3,1);
	sandBank.updateMatrix();
	geomSandBanks.merge(sandBank.geometry, sandBank.matrix);

	var geomSandBankExtend1 = new THREE.SphereGeometry( 150, 10, 10 );
	var sandBankExtend1 = new THREE.Mesh( geomSandBankExtend1, matYellow );
	sandBankExtend1.scale.set(1.3,0.275,1);
	sandBankExtend1.position.set(30, 0, 40);
	sandBankExtend1.updateMatrix();
	geomSandBanks.merge(sandBankExtend1.geometry, sandBankExtend1.matrix);

	var sandBanks = new THREE.Mesh(geomSandBanks, matYellow);
	sandBanks.position.set(0,-30,0);
	sandBanks.castShadow = false;
	sandBanks.receiveShadow = true;
	island.add(sandBanks);

	//Boulders
	var geomBouldersMerged = new THREE.Geometry();

	var geomBoulder = new THREE.DodecahedronGeometry(20,0);
	var boulderLarge = new THREE.Mesh( geomBoulder, matGrey );
	boulderLarge.applyMatrix( new THREE.Matrix4().makeTranslation(-10, 22, 0));
	boulderLarge.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI/10));
	boulderLarge.updateMatrix();
	geomBouldersMerged.merge(boulderLarge.geometry, boulderLarge.matrix);
		//Scatter Small boulders
		for(var i=0; i<15; i++){

			var b = new THREE.Mesh(geomBoulder, matGrey);
				var min = -50;
				var max = 80;
				b.position.z = Math.random() * (max - min) + min;
				b.position.x = Math.random() * (max - min) + min;
				b.position.y = 10;
				b.rotation.y = 0+Math.random()*10;
				b.rotation.z = 0+Math.random()*10;
				b.rotation.z = 0+Math.random()*10;
				var s = .1 + Math.random()*.3;
				b.scale.set(s,s,s);
				b.castShadow = true;
				b.receiveShadow = true;			
			b.updateMatrix();
			geomBouldersMerged.merge(b.geometry, b.matrix);
		}
	var bouldersMerged = new THREE.Mesh(geomBouldersMerged, matGrey);
	bouldersMerged.castShadow = true;
	bouldersMerged.receiveShadow = true;
	island.add(bouldersMerged);

	//PalmTree
	var palmTree = new THREE.Group();
	palmTree.position.set(50,16,0);

	var geomPalmTrunkSegMerged = new THREE.Geometry();

	var geomPalmTrunkSeg = new THREE.BoxGeometry(8,10,8);
	geomPalmTrunkSeg.vertices[0].x+=2.5;
	geomPalmTrunkSeg.vertices[0].z+=2.5;
	geomPalmTrunkSeg.vertices[1].x+=2.5;
	geomPalmTrunkSeg.vertices[1].z-=2.5;
	geomPalmTrunkSeg.vertices[4].x-=2.5;
	geomPalmTrunkSeg.vertices[4].z-=2.5;
	geomPalmTrunkSeg.vertices[5].x-=2.5;
	geomPalmTrunkSeg.vertices[5].z+=2.5;
	var palmTrunkSeg = new THREE.Mesh(geomPalmTrunkSeg, matBrown);
	palmTrunkSeg.updateMatrix();
	geomPalmTrunkSegMerged.merge(palmTrunkSeg.geometry, palmTrunkSeg.matrix);		

	var palmTrunkSeg2 = palmTrunkSeg.clone();
	palmTrunkSeg2.applyMatrix( new THREE.Matrix4().makeTranslation(.5, 9, 0));
	palmTrunkSeg2.applyMatrix(new THREE.Matrix4().makeRotationZ(0.2));
	palmTrunkSeg2.updateMatrix();
	geomPalmTrunkSegMerged.merge(palmTrunkSeg2.geometry, palmTrunkSeg2.matrix);	

	var palmTrunkSeg3 = palmTrunkSeg2.clone();
	palmTrunkSeg3.applyMatrix( new THREE.Matrix4().makeTranslation(-2, 9, 0));
	palmTrunkSeg3.applyMatrix(new THREE.Matrix4().makeRotationY(-0.2));
	palmTrunkSeg3.updateMatrix();
	geomPalmTrunkSegMerged.merge(palmTrunkSeg3.geometry, palmTrunkSeg3.matrix);	

	var palmTrunkSeg4 = palmTrunkSeg3.clone();
	palmTrunkSeg4.applyMatrix( new THREE.Matrix4().makeTranslation(3, 9, 0));
	palmTrunkSeg4.applyMatrix(new THREE.Matrix4().makeRotationY(0.2));
	palmTrunkSeg4.applyMatrix(new THREE.Matrix4().makeRotationZ(0.2));
	palmTrunkSeg4.updateMatrix();
	geomPalmTrunkSegMerged.merge(palmTrunkSeg4.geometry, palmTrunkSeg4.matrix);	

	var palmTrunkSeg5 = palmTrunkSeg4.clone();
	palmTrunkSeg5.applyMatrix( new THREE.Matrix4().makeTranslation(-4, 9, 0));
	palmTrunkSeg5.updateMatrix();
	geomPalmTrunkSegMerged.merge(palmTrunkSeg5.geometry, palmTrunkSeg5.matrix);	

	var palmTrunkSeg6 = palmTrunkSeg5.clone();
	palmTrunkSeg6.applyMatrix( new THREE.Matrix4().makeTranslation(4.5, 10, 0));
	palmTrunkSeg6.applyMatrix(new THREE.Matrix4().makeRotationZ(0.2));
	palmTrunkSeg4.applyMatrix(new THREE.Matrix4().makeRotationY(0.2));
	palmTrunkSeg6.updateMatrix();
	geomPalmTrunkSegMerged.merge(palmTrunkSeg6.geometry, palmTrunkSeg6.matrix);	

	var palmTrunkSeg7 = palmTrunkSeg6.clone();
	palmTrunkSeg7.applyMatrix( new THREE.Matrix4().makeTranslation(4.5, 10, 0));
	palmTrunkSeg7.applyMatrix(new THREE.Matrix4().makeRotationZ(0.2));
	palmTrunkSeg7.updateMatrix();
	geomPalmTrunkSegMerged.merge(palmTrunkSeg7.geometry, palmTrunkSeg7.matrix);	

	var palmTrunkSeg8 = palmTrunkSeg7.clone();
	palmTrunkSeg8.applyMatrix( new THREE.Matrix4().makeTranslation(-17, -.25, 0));
	palmTrunkSeg8.applyMatrix(new THREE.Matrix4().makeRotationZ(-0.2));
	palmTrunkSeg8.updateMatrix();
	geomPalmTrunkSegMerged.merge(palmTrunkSeg8.geometry, palmTrunkSeg8.matrix);	

	var palmTrunkTop = palmTrunkSeg8.clone();
	palmTrunkTop.applyMatrix( new THREE.Matrix4().makeTranslation(-6, -21, 0));
	palmTrunkTop.applyMatrix(new THREE.Matrix4().makeRotationZ(-0.2));
	palmTrunkTop.applyMatrix(new THREE.Matrix4().makeScale(1.3,1.6,1.3));
	palmTrunkTop.updateMatrix();
	geomPalmTrunkSegMerged.merge(palmTrunkTop.geometry, palmTrunkTop.matrix);	

	var palmTrunk = new THREE.Mesh(geomPalmTrunkSegMerged, matBrown);
	palmTrunk.castShadow = true;
	palmTrunk.receiveShadow = true;
	palmTree.add(palmTrunk);

	island.add(palmTree);


	var geomPalmLeavesMerged = new THREE.Geometry();


	var geomPalmLeaf = new THREE.BoxGeometry(20,2,60,2,1,4);
	geomPalmLeaf.vertices[1].y-=1;
	geomPalmLeaf.vertices[6].y-=1;
	geomPalmLeaf.vertices[13].y-=1;
	geomPalmLeaf.vertices[18].y-=1;
	geomPalmLeaf.vertices[2].y-=3;
	geomPalmLeaf.vertices[7].y-=3;
	geomPalmLeaf.vertices[12].y-=3;
	geomPalmLeaf.vertices[17].y-=3;
	geomPalmLeaf.vertices[3].y-=10;
	geomPalmLeaf.vertices[8].y-=10;
	geomPalmLeaf.vertices[11].y-=10;
	geomPalmLeaf.vertices[16].y-=10;
	geomPalmLeaf.vertices[4].y-=20;
	geomPalmLeaf.vertices[9].y-=20;
	geomPalmLeaf.vertices[10].y-=20;
	geomPalmLeaf.vertices[15].y-=20;
	//Ridge
	geomPalmLeaf.vertices[20].y-=18;
	geomPalmLeaf.vertices[21].y-=7;
	geomPalmLeaf.vertices[22].y-=1;
	geomPalmLeaf.vertices[26].y-=1;
	geomPalmLeaf.vertices[27].y-=3;
	geomPalmLeaf.vertices[28].y-=7;
	geomPalmLeaf.vertices[29].y-=18;
	geomPalmLeaf.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, -30) );
	var palmLeaf = new THREE.Mesh(geomPalmLeaf, matGreen);


	for(var i=0; i<6; i++){

		var l = new THREE.Mesh( geomPalmLeaf, matGreen );
		l.rotation.y = i*Math.PI/3;
		var s = .7 + Math.random()*.95;
		l.scale.set(1,s,1);
		l.castShadow = true;
		l.receiveShadow = true;	
		l.updateMatrix();
		geomPalmLeavesMerged.merge(l.geometry, l.matrix);
	}

	for(var i=0; i<6; i++){

		var l = new THREE.Mesh( geomPalmLeaf, matGreen );
		l.rotation.y = i*Math.PI/3 + Math.PI/6;
		l.position.y = -3;
		var s = .5 + Math.random()*.8;
		l.scale.set(.8,s,.7);
		l.castShadow = true;
		l.receiveShadow = true;	
		l.updateMatrix();
		geomPalmLeavesMerged.merge(l.geometry, l.matrix);
	}

	var palmLeaves = new THREE.Mesh(geomPalmLeavesMerged, matGreen);
	palmLeaves.position.set(-34,76,0);
	palmLeaves.rotation.z = Math.PI/10;
	palmLeaves.castShadow = true;
	palmLeaves.receiveShadow = true;
	palmTree.add(palmLeaves);	

	this.mesh.add(island);
}

var Beacon = function() {

	this.mesh = new THREE.Object3D();

	var matRed = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.FlatShading, wireframe:false});
	var matWhite = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading, wireframe:false});

	var geomBeaconMerged = new THREE.Geometry();

	var geomBeaconBase = new THREE.CylinderGeometry( 10, 10, 7, 10, 1);
	var beaconBase = new THREE.Mesh(geomBeaconBase, matRed);
	beaconBase.applyMatrix( new THREE.Matrix4().makeTranslation(0, -1, 0));
	beaconBase.updateMatrix();
	geomBeaconMerged.merge(beaconBase.geometry, beaconBase.matrix);

	var geomBeaconTower1 = new THREE.CylinderGeometry( 6, 8, 10, 4, 1);
	var beaconTower1 = new THREE.Mesh(geomBeaconTower1, matRed);
	beaconTower1.applyMatrix( new THREE.Matrix4().makeTranslation(0, 7.5, 0));
	beaconTower1.updateMatrix();
	geomBeaconMerged.merge(beaconTower1.geometry, beaconTower1.matrix);

	var geomBeaconTower2 = new THREE.CylinderBufferGeometry( 4.5, 5.5, 6, 4, 1);
	var beaconTower2 = new THREE.Mesh(geomBeaconTower2, matWhite);
	beaconTower2.position.set(0,13,0);
	beaconTower2.castShadow = true;
	beaconTower2.receiveShadow = true;	
	this.mesh.add(beaconTower2);

	var geomBeaconTower3 = new THREE.CylinderGeometry( 3.5, 5.5, 10, 4, 1);
	var beaconTower3 = new THREE.Mesh(geomBeaconTower3, matRed);
	beaconTower3.applyMatrix( new THREE.Matrix4().makeTranslation(0, 21, 0));
	beaconTower3.updateMatrix();
	geomBeaconMerged.merge(beaconTower3.geometry, beaconTower3.matrix);

	var geomBeaconTop = new THREE.SphereGeometry( 5, 4, 5);
	var beaconTop = new THREE.Mesh(geomBeaconTop, matRed);
	beaconTop.applyMatrix( new THREE.Matrix4().makeTranslation(0, 29, 0));
	beaconTop.updateMatrix();
	geomBeaconMerged.merge(beaconTop.geometry, beaconTop.matrix);

	var beacon = new THREE.Mesh(geomBeaconMerged, matRed);
	beacon.castShadow = true;
	beacon.receiveShadow = true;

	this.mesh.add(beacon);
}

var swayBeacon = function (){
	for (var i = 0; i <beaconArray.length; i++){
		var min = 0.005;
		var max = 0.01;
		var offset = Math.random() * (max - min) + min;
	 	beaconArray[i].mesh.rotation.z = Math.sin(Date.now() * 0.0008)  * Math.PI * 0.05 ;
		beaconArray[i].mesh.rotation.x = Math.sin(Date.now() * 0.001 + offset)  * Math.PI * 0.02 ;
		beaconArray[i].mesh.position.y = Math.sin(Date.now() * 0.001 + offset)  * -1 ;
    }
}


function SeaGull(){
	this.mesh = new THREE.Object3D();
	var gull = new THREE.Group();


	var matGrey = new THREE.MeshPhongMaterial({color:Colors.grey, shading:THREE.SmoothShading, wireframe:false});
	var matWhite = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.SmoothShading, wireframe:false});
	var matOrange = new THREE.MeshPhongMaterial({color:Colors.orange, shading:THREE.SmoothShading, wireframe:false});

	var geomBody = new THREE.BoxGeometry( 4, 4, 18, 2,1,2 );
	geomBody.vertices[0].y-=1;
	geomBody.vertices[1].x+=2;
	geomBody.vertices[2].y-=1;
	geomBody.vertices[3].y+=1;
	geomBody.vertices[4].x+=2;
	geomBody.vertices[5].y+=1;
	geomBody.vertices[6].y-=1;
	geomBody.vertices[7].x-=2;
	geomBody.vertices[8].y-=1;
	geomBody.vertices[9].y+=1;
	geomBody.vertices[10].x-=2;
	geomBody.vertices[11].y+=1;
	geomBody.vertices[13].y+=1.5;
	geomBody.vertices[16].y-=1;
	geomBody.mergeVertices();
	var body = new THREE.Mesh( geomBody, matWhite );
	body.castShadow = true;
	body.receiveShadow = true;	
	gull.add(body);

	var geomTail = new THREE.BoxGeometry( 4, 2, 8);
	geomTail.vertices[0].y-=.75;
	geomTail.vertices[0].x+=1;
	geomTail.vertices[2].y+=.75;
	geomTail.vertices[2].x+=1;
	geomTail.vertices[5].y-=.75;
	geomTail.vertices[5].x-=1;
	geomTail.vertices[7].x-=1;
	geomTail.vertices[7].y+=.75;
	geomTail.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, 4.5) );
	this.tail = new THREE.Mesh( geomTail, matWhite );
	this.tail.castShadow = true;
	//tail.rotation.x = Math.PI/20;
	this.tail.receiveShadow = true;	
	this.tail.position.set(0,0,8);
	gull.add(this.tail);	

	var geomHead = new THREE.BoxGeometry( 3.5, 3.5, 6, 2,1,2 );
	geomHead.vertices[0].y-=1;
	geomHead.vertices[1].x+=1;
    geomHead.vertices[2].y-=1;
    geomHead.vertices[2].z-=1; 
    geomHead.vertices[2].x-=1; 
	geomHead.vertices[3].y+=1;
	geomHead.vertices[4].x+=1;
    geomHead.vertices[5].y+=1;
    geomHead.vertices[5].z-=1; 
    geomHead.vertices[5].x-=1; 
    geomHead.vertices[6].y-=1;
    geomHead.vertices[6].z-=1; 
    geomHead.vertices[6].x+=1;   
	geomHead.vertices[7].x-=1;
	geomHead.vertices[8].y-=1;
	geomHead.vertices[9].y+=1;
	geomHead.vertices[9].z-=1;
	geomHead.vertices[9].x+=1;
	geomHead.vertices[10].x-=1;
	geomHead.vertices[11].y+=1;
	geomHead.vertices[12].z-=1; 
    geomHead.vertices[12].y-=1;
	geomHead.vertices[13].y+=1;
	geomHead.vertices[16].y-=1;
    geomHead.vertices[17].y+=1;
    geomHead.vertices[17].z-=1; 
  	geomHead.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, -5) );
	this.head = new THREE.Mesh( geomHead, matWhite );
	this.head.rotation.x = -Math.PI/15;
	this.head.castShadow = true;
	this.head.receiveShadow = true;	
	this.head.position.set(0,0.5,-6);
	gull.add(this.head);	

	var geomBeak = new THREE.BoxGeometry(1, 1, 6,);
	geomBeak.vertices[0].y+=.25;
	geomBeak.vertices[0].x+=.25;
	geomBeak.vertices[2].y-=.25;
	geomBeak.vertices[2].x+=.25;
	geomBeak.vertices[5].y+=.25;
	geomBeak.vertices[5].x-=.25;
	geomBeak.vertices[7].y-=.25;
	geomBeak.vertices[7].x-=.25;
	var beak = new THREE.Mesh( geomBeak, matOrange );
	beak.castShadow = true;
	beak.receiveShadow = true;	
	beak.position.set(0,0,-11);
	this.head.add(beak);	


	var geomWingLeftInner = new THREE.BoxGeometry(10, 1, 8);
	geomWingLeftInner.vertices[0].z+=4;
	geomWingLeftInner.vertices[0].x+=2;
	geomWingLeftInner.vertices[5].x+=1.5;
	geomWingLeftInner.vertices[7].x+=1.5;
	geomWingLeftInner.vertices[7].y+=.5;
	geomWingLeftInner.applyMatrix( new THREE.Matrix4().makeTranslation(-8, 0, 0) );
  	geomWingLeftInner.applyMatrix(new THREE.Matrix4().makeRotationY(-Math.PI/20));
	this.wingLeftInner = new THREE.Mesh( geomWingLeftInner, matWhite );
	//this.wingLeftInner.rotation.z = -Math.PI/15;
	this.wingLeftInner.castShadow = true;
	this.wingLeftInner.receiveShadow = true;	
	this.wingLeftInner.position.set(0,0,-2);
	gull.add(this.wingLeftInner);	

	var geomWingLeftOuter = new THREE.BoxGeometry(16, 1, 8);
	geomWingLeftOuter.vertices[0].x-=.5;
	geomWingLeftOuter.vertices[1].x+=.5;
	geomWingLeftOuter.vertices[2].x-=.5;
	geomWingLeftOuter.vertices[2].y+=.5;
	geomWingLeftOuter.vertices[3].x+=.5;
	geomWingLeftOuter.vertices[4].x+=15;
	geomWingLeftOuter.vertices[6].x+=5;
	geomWingLeftOuter.vertices[5].x-=2;
	geomWingLeftOuter.vertices[5].y-=1;
	geomWingLeftOuter.vertices[7].x-=2;
	geomWingLeftOuter.applyMatrix( new THREE.Matrix4().makeTranslation(-8, 0, 0) );
  	geomWingLeftOuter.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI/20));
	this.wingLeftOuter = new THREE.Mesh( geomWingLeftOuter, matWhite );
	//this.wingLeftOuter.rotation.z = Math.PI/10;
	this.wingLeftOuter.castShadow = true;
	this.wingLeftOuter.receiveShadow = true;	
	this.wingLeftOuter.position.set(-11.8,0,-1.95);
	this.wingLeftInner.add(this.wingLeftOuter);


	var geomWingRightInner = new THREE.BoxGeometry(10, 1, 8);
	 geomWingRightInner.vertices[5].z+=4;
	 geomWingRightInner.vertices[7].z+=4;
	 geomWingRightInner.vertices[7].x-=2;
	 geomWingRightInner.vertices[7].y+=1;		 
	 geomWingRightInner.vertices[5].x-=2;
	 geomWingRightInner.vertices[0].x-=1.5;
	 geomWingRightInner.vertices[2].x-=1.5;
	 geomWingRightInner.vertices[2].y+=.5;
	geomWingRightInner.applyMatrix( new THREE.Matrix4().makeTranslation(8, 0, 0) );
  	geomWingRightInner.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI/20));

	this.wingRightInner = new THREE.Mesh( geomWingRightInner, matWhite );
	//this.wingRightInner.rotation.z = -Math.PI/15;
	this.wingRightInner.castShadow = true;
	this.wingRightInner.receiveShadow = true;	
	this.wingRightInner.position.set(0,0,-2);
	gull.add(this.wingRightInner);	


	var geomWingRightOuter = new THREE.BoxGeometry(16, 1, 8);
	geomWingRightOuter.vertices[0].x-=.5;
	geomWingRightOuter.vertices[0].y-=.5;
	geomWingRightOuter.vertices[1].x+=.5;
	geomWingRightOuter.vertices[2].x-=.5;
	geomWingRightOuter.vertices[2].y+=0;
	geomWingRightOuter.vertices[3].x+=.5;
	geomWingRightOuter.vertices[4].x+=5;
	geomWingRightOuter.vertices[6].x+=15;
	geomWingRightOuter.vertices[5].x-=2;
	geomWingRightOuter.vertices[5].y-=1;
	geomWingRightOuter.vertices[7].x-=2;
	geomWingRightOuter.applyMatrix( new THREE.Matrix4().makeTranslation(-8, 0, 0) );
 	geomWingRightOuter.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI/20));
  	geomWingRightOuter.applyMatrix(new THREE.Matrix4().makeRotationZ(Math.PI));
	this.wingRightOuter = new THREE.Mesh( geomWingRightOuter, matWhite );
	this.wingRightOuter.castShadow = true;
	this.wingRightOuter.receiveShadow = true;	
	this.wingRightOuter.position.set(11.8,0,-1.95);
	this.wingRightInner.add(this.wingRightOuter);

	this.mesh.add(gull);
}

var flapWings = function (){

	for (var i = 0; i <seaGullArray.length; i++){
		var flapRate = 0.0075;

		seaGullArray[i].wingRightInner.rotation.z = Math.sin(Date.now() * flapRate) * Math.PI * 0.1 ;	
		seaGullArray[i].wingLeftInner.rotation.z = Math.sin(Date.now() * flapRate) * -Math.PI * 0.1 ;	
		seaGullArray[i].wingRightOuter.rotation.z = Math.sin(Date.now() * flapRate) * Math.PI * 0.2 ;	
		seaGullArray[i].wingLeftOuter.rotation.z = Math.sin(Date.now() * flapRate) * -Math.PI * 0.2 ;
		seaGullArray[i].tail.rotation.x = Math.sin(Date.now() * 0.001) * -Math.PI * 0.05 ;
		seaGullArray[i].head.rotation.y = Math.sin(Date.now() * 0.001) * Math.PI * 0.075 ;
		seaGullArray[i].mesh.translateY (Math.sin(Date.now() * flapRate) * -.07)  ;	

    }
}


var Boat = function() {
	
	this.mesh = new THREE.Object3D();
	var cameraMesh = new THREE.Group();
	this.group = new THREE.Group();

	var matGrey = new THREE.MeshPhongMaterial({color:Colors.grey, shading:THREE.SmoothShading, wireframe:false});
	var matDarkGrey = new THREE.MeshStandardMaterial({color:Colors.darkGrey,emissive: Colors.darkGrey,emissiveIntensity: 0.25,metalness: .3,roughness: .15,	shading:THREE.FlatShading,	wireframe:false});
	var matWhite = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.SmoothShading, wireframe:false});
	var matRed = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.SmoothShading, wireframe:false});
	var matBrown = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.SmoothShading, wireframe:false});
	var matLightBrown = new THREE.MeshPhongMaterial({color:Colors.lightBrown, shading:THREE.SmoothShading, wireframe:false});
	var matLightGreen = new THREE.MeshPhongMaterial({color:Colors.lightGreen, shading:THREE.SmoothShading, wireframe:false});
	var matYellow = new THREE.MeshPhongMaterial({color:Colors.yellow, shading:THREE.SmoothShading, wireframe:false});
	var matBlueGlass = new THREE.MeshPhongMaterial({color:Colors.blue, shading:THREE.SmoothShading,	transparent: true, opacity: .6, wireframe:false});
	var matOrange = new THREE.MeshPhongMaterial({color:Colors.orange, shading:THREE.SmoothShading, wireframe:false});

	var geomWhiteMerged = new THREE.Geometry();
	var geomBrownMerged = new THREE.Geometry();
	var geomBlueMerged = new THREE.Geometry();

	var geomHull = new THREE.BoxGeometry(25,7.5,50,1,1,2);
		//bow vertices
		geomHull.vertices[2].x-=12.5;
		geomHull.vertices[5].x-=12.5;
		geomHull.vertices[5].z+=5;
		geomHull.vertices[6].x+=12.5;
		geomHull.vertices[9].x+=12.5;
		geomHull.vertices[9].z+=5;	
		//Sub vertices
		geomHull.vertices[3].x-=5;
		geomHull.vertices[4].x-=5;	
		geomHull.vertices[10].x+=5;
		geomHull.vertices[11].x+=5;
		//extendBoat
		geomHull.vertices[4].z-=10;
		geomHull.vertices[10].z-=10;
		geomHull.vertices[1].z-=10;
		geomHull.vertices[7].z-=10;
	geomHull.applyMatrix( new THREE.Matrix4().makeTranslation(0, -1.25, 0) );
	var hull = new THREE.Mesh(geomHull, matWhite);
	hull.updateMatrix();
	geomWhiteMerged.merge(hull.geometry, hull.matrix);


	var geomLowerRailOuter = new THREE.BoxGeometry(25,3,50,1,1,2);
	geomLowerRailOuter.vertices[2].x-=12.5;
	geomLowerRailOuter.vertices[5].x-=12.5;
	geomLowerRailOuter.vertices[6].x+=12.5;
	geomLowerRailOuter.vertices[9].x+=12.5;

	geomLowerRailOuter.vertices[2].z-=2;
	geomLowerRailOuter.vertices[5].z-=2;
	geomLowerRailOuter.vertices[6].z-=2;
	geomLowerRailOuter.vertices[9].z-=2;

	geomLowerRailOuter.vertices[4].z-=10;
	geomLowerRailOuter.vertices[10].z-=10;
	geomLowerRailOuter.vertices[1].z-=10;
	geomLowerRailOuter.vertices[7].z-=10;

	var geomLowerDeckInner = new THREE.BoxGeometry(20,3,45,1,1,2);
	geomLowerDeckInner.vertices[2].x-=10;
	geomLowerDeckInner.vertices[5].x-=10;
	geomLowerDeckInner.vertices[6].x+=10;
	geomLowerDeckInner.vertices[9].x+=10;
	geomLowerDeckInner.vertices[4].z-=9;
	geomLowerDeckInner.vertices[10].z-=9;
	geomLowerDeckInner.vertices[1].z-=9;
	geomLowerDeckInner.vertices[7].z-=9;

	var geomLowerRailInnerBSP = new ThreeBSP(geomLowerDeckInner);
	var geomLowerRailOuterBSP = new ThreeBSP(geomLowerRailOuter);
	var lowerRailBSP = geomLowerRailOuterBSP.subtract(geomLowerRailInnerBSP); 

	var lowerRail = lowerRailBSP.toMesh( matBrown );

	lowerRail.position.set(0,4,0);
	lowerRail.updateMatrix();
	geomBrownMerged.merge(lowerRail.geometry, lowerRail.matrix);


	var geomUpperRailOuter = new THREE.BoxGeometry(25,1,50,1,1,2);
	geomUpperRailOuter.vertices[2].x-=12.5;
	geomUpperRailOuter.vertices[5].x-=12.5;
	geomUpperRailOuter.vertices[6].x+=12.5;
	geomUpperRailOuter.vertices[9].x+=12.5;

	geomUpperRailOuter.vertices[2].z-=2;
	geomUpperRailOuter.vertices[5].z-=2;
	geomUpperRailOuter.vertices[6].z-=2;
	geomUpperRailOuter.vertices[9].z-=2;

	geomUpperRailOuter.vertices[4].z-=10;
	geomUpperRailOuter.vertices[10].z-=10;
	geomUpperRailOuter.vertices[1].z-=10;
	geomUpperRailOuter.vertices[7].z-=10;

	var geomUpperDeckInner = new THREE.BoxGeometry(20,1,45,1,1,2);
	geomUpperDeckInner.vertices[2].x-=10;
	geomUpperDeckInner.vertices[5].x-=10;
	geomUpperDeckInner.vertices[6].x+=10;
	geomUpperDeckInner.vertices[9].x+=10;
	geomUpperDeckInner.vertices[4].z-=9;
	geomUpperDeckInner.vertices[10].z-=9;
	geomUpperDeckInner.vertices[1].z-=9;
	geomUpperDeckInner.vertices[7].z-=9;

	var geomUpperRailInnerBSP = new ThreeBSP(geomUpperDeckInner);
	var geomUpperRailOuterBSP = new ThreeBSP(geomUpperRailOuter);
	var upperRailBSP = geomUpperRailOuterBSP.subtract(geomUpperRailInnerBSP); 

	var geomUpperDeckCut = new THREE.BoxGeometry(8,5,5);
	geomUpperDeckCut.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, 24) );
	var geomUpperDeckCutBSP = new ThreeBSP(geomUpperDeckCut);


	var upperRailCutBSP = upperRailBSP.subtract(geomUpperDeckCutBSP); 

	var upperRail = upperRailCutBSP.toMesh( matBrown );

	upperRail.position.set(0,8.5,0);
	upperRail.updateMatrix();
	geomBrownMerged.merge(upperRail.geometry, upperRail.matrix);


	// Rope railing	
	var ropeCurve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(-4.5,0,-.65),
		new THREE.Vector3(-8,-3,0),
		new THREE.Vector3(-12.75,0,0.5),
		new THREE.Vector3(-13,0,0),
		new THREE.Vector3(-13,-3,-5),	
		new THREE.Vector3(-13,0,-9.5),
		new THREE.Vector3(-13,0,-10.5),
		new THREE.Vector3(-13,-3,-15),	
		new THREE.Vector3(-13,0,-20),		
		new THREE.Vector3(-13,-3,-25),
		new THREE.Vector3(-13,0,-30),
		new THREE.Vector3(-12.5,-3,-35),
		new THREE.Vector3(-9.75,0,-39),
		new THREE.Vector3(-8,-3,-44),
		new THREE.Vector3(-3,0,-48),
			new THREE.Vector3(0,-2,-51),
		new THREE.Vector3(3,0,-48),
		new THREE.Vector3(6,-3,-44),
		new THREE.Vector3(9.75,0,-39),
		new THREE.Vector3(12.5,-3,-35),
		new THREE.Vector3(13,0,-30),
		new THREE.Vector3(14,-3,-25),
		new THREE.Vector3(13,0,-20),
		new THREE.Vector3(13,-3,-15),
		new THREE.Vector3(13,0,-10),
		new THREE.Vector3(13,-3,-5),
		new THREE.Vector3(13,0,0),	
		new THREE.Vector3(12.75,0,0.5),	
		new THREE.Vector3(8,-3,0),
		new THREE.Vector3(4.5,0,-.65)
		]);
	var ropeGeom = new THREE.TubeGeometry(ropeCurve, 120, .5, 8, false);

	var textRope = new THREE.TextureLoader().load( "images/rope.jpg" );
	textRope.wrapS = THREE.RepeatWrapping;
	textRope.wrapT = THREE.RepeatWrapping;
	textRope.repeat.set( 50, 1 );

	var matRope = new THREE.MeshStandardMaterial( {
		transparent: false,
		map: textRope,
		roughness: 1,
	});

	var rope = new THREE.Mesh(ropeGeom, matRope);
	rope.position.set(0,8.5,25);
	rope.castShadow = true;
	rope.receiveShadow = true;	
	this.group.add(rope);

	// Boyes
	var geomBoatBoye = new THREE.SphereBufferGeometry(3,8,8);
	var boatBoye = new THREE.Mesh(geomBoatBoye, matRed);
	boatBoye.castShadow = true;
	boatBoye.receiveShadow = true;	
	geomBoatBoye.applyMatrix( new THREE.Matrix4().makeTranslation(0, -3, 0) );
	boatBoye.position.set(14,6,0);
	boatBoye.rotation.z = Math.PI/8;
	this.group.add(boatBoye);	 

	var geomBoatBoyeTop = new THREE.CylinderBufferGeometry(1,2.5,2,8);
	geomBoatBoyeTop.applyMatrix( new THREE.Matrix4().makeTranslation(0,-3, 0) );
	var boatBoyeTop = new THREE.Mesh(geomBoatBoyeTop, matWhite);
	boatBoyeTop.castShadow = true;
	boatBoyeTop.receiveShadow = true;	
	boatBoyeTop.position.set(0,2.5,0);
	boatBoye.add(boatBoyeTop);	 

	var boatBoye2 = boatBoye.clone();
	boatBoye2.position.set(-7.5, 6, -19);
	boatBoye2.rotation.z = -Math.PI/6;
	boatBoye2.rotation.y = -Math.PI/6;
	this.group.add(boatBoye2);	 

	// Railing
	var geomRail = new THREE.BoxGeometry(1.5,3,1.5,);
	var rail1 = new THREE.Mesh(geomRail, matBrown);
	rail1.castShadow = true;
	rail1.receiveShadow = true;	
	rail1.position.set(11,7,23.5);
	rail1.updateMatrix();
	geomBrownMerged.merge(rail1.geometry, rail1.matrix);

	var rail2 = rail1.clone();
	rail2.castShadow = true;
	rail2.receiveShadow = true;	
	rail2.position.set(-6,7,23.5);
	rail2.updateMatrix();
	geomBrownMerged.merge(rail2.geometry, rail2.matrix);

	var rail3 = rail1.clone();
	rail3.castShadow = true;
	rail3.receiveShadow = true;	
	rail3.position.set(6,7,23.5);
	rail3.updateMatrix();
	geomBrownMerged.merge(rail3.geometry, rail3.matrix);

	var rail4 = rail1.clone();
	rail4.castShadow = true;
	rail4.receiveShadow = true;	
	rail4.position.set(-11,7,23.5);
	rail4.updateMatrix();
	geomBrownMerged.merge(rail4.geometry, rail4.matrix);

	var railRep = rail1.clone();
	railRep.castShadow = true;
	railRep.receiveShadow = true;	
	railRep.position.set(-11,7,14);
	railRep.updateMatrix();
	geomBrownMerged.merge(railRep.geometry, railRep.matrix);

	var rail5 = rail1.clone();
	rail5.castShadow = true;
	rail5.receiveShadow = true;	
	rail5.position.set(11,7,14);
	rail5.updateMatrix();
	geomBrownMerged.merge(rail5.geometry, rail5.matrix);

	var railRep2 = railRep.clone();
	railRep2.castShadow = true;
	railRep2.receiveShadow = true;	
	railRep2.position.set(11,7,2);
	railRep2.updateMatrix();
	geomBrownMerged.merge(railRep2.geometry, railRep2.matrix);

	var railRep2b = railRep2.clone();
	railRep2b.castShadow = true;
	railRep2b.receiveShadow = true;	
	railRep2b.position.set(-11,7,2);
	railRep2b.updateMatrix();
	geomBrownMerged.merge(railRep2b.geometry, railRep2b.matrix);

	var railRep3 = railRep.clone();
	railRep3.castShadow = true;
	railRep3.receiveShadow = true;	
	railRep3.position.set(-11,7,-9.5);
	railRep3.updateMatrix();
	geomBrownMerged.merge(railRep3.geometry, railRep3.matrix);

	var railRep3b = railRep3.clone();
	railRep3b.castShadow = true;
	railRep3b.receiveShadow = true;	
	railRep3b.position.set(11,7,-9.5);
	railRep3b.updateMatrix();
	geomBrownMerged.merge(railRep3b.geometry, railRep3b.matrix);

	var rail6 = rail1.clone();
	rail6.castShadow = true;
	rail6.receiveShadow = true;	
	rail6.position.set(-5.5,7,-17);
	rail6.rotation.y = Math.PI/3.5;
	rail6.updateMatrix();
	geomBrownMerged.merge(rail6.geometry, rail6.matrix);

	var rail7 = rail1.clone();
	rail7.castShadow = true;
	rail7.receiveShadow = true;	
	rail7.position.set(5.5,7,-17);
	rail7.rotation.y = Math.PI/3.5;
	rail7.updateMatrix();
	geomBrownMerged.merge(rail7.geometry, rail7.matrix);

	var rail8 = rail1.clone();
	rail8.castShadow = true;
	rail8.receiveShadow = true;	
	rail8.position.set(0,7,-24);
	rail8.rotation.y = Math.PI/4;
	rail8.updateMatrix();
	geomBrownMerged.merge(rail8.geometry, rail8.matrix);


	//Cabin
	var cabin = new THREE.Group();	
	cabin.position.set(0,13,10);

	var geomCabinCorner = new THREE.BoxGeometry(2,24,2);
	var cabinCorner1 = new THREE.Mesh(geomCabinCorner, matBrown);
	cabinCorner1.castShadow = true;
	cabinCorner1.receiveShadow = true;	
	cabinCorner1.position.set(7,14,3);
	cabinCorner1.updateMatrix();
	geomBrownMerged.merge(cabinCorner1.geometry, cabinCorner1.matrix);

	var cabinCorner2 = cabinCorner1.clone();
	cabinCorner2.castShadow = true;
	cabinCorner2.receiveShadow = true;	
	cabinCorner2.position.set(-7,14,3);
	cabinCorner2.updateMatrix();
	geomBrownMerged.merge(cabinCorner2.geometry, cabinCorner2.matrix);

	var geomCabinCornerShort = new THREE.BoxGeometry(2,22,2);
	var cabinCorner3 = new THREE.Mesh(geomCabinCornerShort, matBrown);
	cabinCorner3.castShadow = true;
	cabinCorner3.receiveShadow = true;	
	cabinCorner3.position.set(-7,13,17);
	cabinCorner3.updateMatrix();
	geomBrownMerged.merge(cabinCorner3.geometry, cabinCorner3.matrix);

	var cabinCorner4 = cabinCorner3.clone();
	cabinCorner4.castShadow = true;
	cabinCorner4.receiveShadow = true;	
	cabinCorner4.position.set(7,13,17);
	cabinCorner4.updateMatrix();
	geomBrownMerged.merge(cabinCorner4.geometry, cabinCorner4.matrix);

	//Cabin Roof
	var geomCabinRoof = new THREE.BoxGeometry(20,1,20, 2,1,1);
	geomCabinRoof.vertices[8].y+=.5;
	geomCabinRoof.vertices[9].y+=.5;
	geomCabinRoof.vertices[10].y+=.5;
	geomCabinRoof.vertices[11].y+=.5;
	var cabinRoof = new THREE.Mesh(geomCabinRoof, matWhite);
	cabinRoof.position.set(0,25,10);
	cabinRoof.rotation.x = Math.PI/20;
	cabinRoof.updateMatrix();
	geomWhiteMerged.merge(cabinRoof.geometry, cabinRoof.matrix);

	var geomRoofCrest = new THREE.BoxGeometry(5,0.5,20, 2,1,1);
	geomRoofCrest.vertices[8].y+=.5;
	geomRoofCrest.vertices[9].y+=.5;
	var roofCrest = new THREE.Mesh(geomRoofCrest, matGrey);
	roofCrest.position.set(0,26,10);
	roofCrest.rotation.x = cabinRoof.rotation.x;
	roofCrest.updateMatrix();
	geomWhiteMerged.merge(roofCrest.geometry, roofCrest.matrix);

	//Cabin Walls

	var geomCabinSideWall = new THREE.BoxGeometry(1,22,12);
	geomCabinSideWall.vertices[1].y+=2.5;
	geomCabinSideWall.vertices[4].y+=2.5;
	var geomCabinSideWallCut = new THREE.CylinderGeometry(4,4,1,20);
	geomCabinSideWallCut.applyMatrix(new THREE.Matrix4().makeRotationZ(-Math.PI/2));
	geomCabinSideWallCut.applyMatrix(new THREE.Matrix4().makeTranslation(0, 4, 0));	
	var CabinSideWallBSP = new ThreeBSP(geomCabinSideWall);
	var CabinSideWallCutBSP = new ThreeBSP(geomCabinSideWallCut);
	var CabinSideWallIntersectionBSP = CabinSideWallBSP.subtract(CabinSideWallCutBSP);  
	var cabinSideWallR = CabinSideWallIntersectionBSP.toMesh(matGrey);
	cabinSideWallR.position.set(6.5,13,10);
	cabinSideWallR.updateMatrix();
	geomWhiteMerged.merge(cabinSideWallR.geometry, cabinSideWallR.matrix);

		//Cabin SideWindows	
		var geomCabinSideWindowFrame = new THREE.CylinderGeometry(4,4,1.5,20);
		var geomCabinSideWindowFrameCut = new THREE.CylinderGeometry(3.5,3.5,1.5,20);
		var geomCabinSideWindowFrameBSP = new ThreeBSP(geomCabinSideWindowFrame);
		var geomCabinSideWindowFrameCutBSP = new ThreeBSP(geomCabinSideWindowFrameCut);
		var CabinSideWindowFrameIntersectionBSP = geomCabinSideWindowFrameBSP.subtract(geomCabinSideWindowFrameCutBSP);  	
		var cabinSideWindowFrame = CabinSideWindowFrameIntersectionBSP.toMesh(matGrey);
		cabinSideWindowFrame.applyMatrix(new THREE.Matrix4().makeRotationZ(-Math.PI/2));
		cabinSideWindowFrame.position.set(6.5,17,10);
		cabinSideWindowFrame.updateMatrix();
		geomWhiteMerged.merge(cabinSideWindowFrame.geometry, cabinSideWindowFrame.matrix);


		var geomCabinSideWindow = new THREE.CylinderGeometry(3.5,3.5,1,20);
		geomCabinSideWindow.applyMatrix(new THREE.Matrix4().makeRotationZ(-Math.PI/2));
		var cabinSideWindow = new THREE.Mesh(geomCabinSideWindow, matBlueGlass);
		cabinSideWindow.position.set(6.5,17,10);		
		cabinSideWindow.updateMatrix();
		geomBlueMerged.merge(cabinSideWindow.geometry, cabinSideWindow.matrix);

		var cabinSideWallL = cabinSideWallR.clone();
		cabinSideWallL.position.set(-6.5,13,10);
		cabinSideWallL.updateMatrix();
		geomWhiteMerged.merge(cabinSideWallL.geometry, cabinSideWallL.matrix);

		var cabinSideWindowFrameL = cabinSideWindowFrame.clone();
		cabinSideWindowFrameL.position.set(-6.5,17,10);
		cabinSideWindowFrameL.updateMatrix();
		geomWhiteMerged.merge(cabinSideWindowFrameL.geometry, cabinSideWindowFrameL.matrix);

		var cabinSideWindowL = cabinSideWindow.clone();
		cabinSideWindowL.position.set(-6.5,17,10);
		cabinSideWindowL.updateMatrix();
		geomBlueMerged.merge(cabinSideWindowL.geometry, cabinSideWindowL.matrix);


	var geomCabinFrontWall = new THREE.BoxGeometry(12,24,1,5);
	var geomCabinFrontWallCut = new THREE.BoxGeometry(9,12,1,5);
	geomCabinFrontWallCut.vertices[0].y-=2.5;
	geomCabinFrontWallCut.vertices[1].y-=2.5;
	geomCabinFrontWallCut.vertices[4].y-=2.5;
	geomCabinFrontWallCut.vertices[5].y-=2.5;

	geomCabinFrontWallCut.applyMatrix( new THREE.Matrix4().makeTranslation(0, 3, 0));
	var CabinFrontWallBSP = new ThreeBSP(geomCabinFrontWall);
	var CabinFrontWallCutBSP = new ThreeBSP(geomCabinFrontWallCut);
	var CabinFrontWallIntersectionBSP = CabinFrontWallBSP.subtract(CabinFrontWallCutBSP);  	
	var cabinFrontWall = CabinFrontWallIntersectionBSP.toMesh(matWhite);
	cabinFrontWall.position.set(0,14.5,3.5);
	cabinFrontWall.updateMatrix();
	geomWhiteMerged.merge(cabinFrontWall.geometry, cabinFrontWall.matrix);

	var geomCabinBackWall = new THREE.BoxGeometry(12,22,1);
	var geomCabinBackWallCut = new THREE.BoxGeometry(8,16,1);
	geomCabinBackWallCut.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, 0));
	var CabinBackWallBSP = new ThreeBSP(geomCabinBackWall);
	var CabinBackWallCutBSP = new ThreeBSP(geomCabinBackWallCut);
	var CabinBackWallIntersectionBSP = CabinBackWallBSP.subtract(CabinBackWallCutBSP);  	
	var cabinBackWall = CabinBackWallIntersectionBSP.toMesh(matWhite);
	cabinBackWall.position.set(0,13,16.5);
	cabinBackWall.updateMatrix();
	geomWhiteMerged.merge(cabinBackWall.geometry, cabinBackWall.matrix);

	var geomCabinDoor = new THREE.BoxGeometry(8,16,1);
	var geomCabinDoorCut = new THREE.CylinderGeometry(2,2,1,20);
	geomCabinDoorCut.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	geomCabinDoorCut.applyMatrix(new THREE.Matrix4().makeTranslation(0, 2, 0));	
	var CabinDoorBSP = new ThreeBSP(geomCabinDoor);
	var CabinDoorCutBSP = new ThreeBSP(geomCabinDoorCut);
	var CabinDoorlIntersectionBSP = CabinDoorBSP.subtract(CabinDoorCutBSP);  
	var cabinDoor = CabinDoorlIntersectionBSP.toMesh(matGrey);
	cabinDoor.position.set(0,13,17.5);
	cabinDoor.updateMatrix();
	geomWhiteMerged.merge(cabinDoor.geometry, cabinDoor.matrix);

	var geomCabinDoorWindow = new THREE.CylinderGeometry(2,2,1,20);
	geomCabinDoorWindow.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	geomCabinDoorWindow.applyMatrix(new THREE.Matrix4().makeTranslation(0, 2, 0));	
	var cabinDoorWindow = new THREE.Mesh(geomCabinDoorWindow, matBlueGlass);
	cabinDoorWindow.position.set(0,13,17.5);
	cabinDoorWindow.updateMatrix();
	geomBlueMerged.merge(cabinDoorWindow.geometry, cabinDoorWindow.matrix);



	//Cabin Windows
	var geomCabinFrontWindowFrame = new THREE.BoxGeometry(9,12,1.5,5);
	geomCabinFrontWindowFrame.vertices[0].y-=2.5;
	geomCabinFrontWindowFrame.vertices[1].y-=2.5;
	geomCabinFrontWindowFrame.vertices[4].y-=2.5;
	geomCabinFrontWindowFrame.vertices[5].y-=2.5;
	var geomCabinFrontWindowFrameCut = new THREE.BoxGeometry(8,11,1.5,5);
	geomCabinFrontWindowFrameCut.vertices[0].y-=2.5;
	geomCabinFrontWindowFrameCut.vertices[1].y-=2.5;
	geomCabinFrontWindowFrameCut.vertices[4].y-=2.5;
	geomCabinFrontWindowFrameCut.vertices[5].y-=2.5;
	var geomCabinFrontWindowFrameBSP = new ThreeBSP(geomCabinFrontWindowFrame);
	var geomCabinFrontWindowFrameCutBSP = new ThreeBSP(geomCabinFrontWindowFrameCut);
	var CabinFrontWindowFrameIntersectionBSP = geomCabinFrontWindowFrameBSP.subtract(geomCabinFrontWindowFrameCutBSP);  	
	var cabinFrontWindowFrame = CabinFrontWindowFrameIntersectionBSP.toMesh(matGrey);
	cabinFrontWindowFrame.position.set(0,17.5,3.5);
	cabinFrontWindowFrame.updateMatrix();
	geomWhiteMerged.merge(cabinFrontWindowFrame.geometry, cabinFrontWindowFrame.matrix);

	var geomCabinFrontWindow = new THREE.BoxGeometry(8,11,1,5);
	geomCabinFrontWindow.vertices[0].y-=2.5;
	geomCabinFrontWindow.vertices[1].y-=2.5;
	geomCabinFrontWindow.vertices[4].y-=2.5;
	geomCabinFrontWindow.vertices[5].y-=2.5;
	var cabinFrontWindow = new THREE.Mesh(geomCabinFrontWindow, matBlueGlass);
	cabinFrontWindow.position.set(0,17.5,3.5);
	cabinFrontWindow.updateMatrix();
	geomBlueMerged.merge(cabinFrontWindow.geometry, cabinFrontWindow.matrix);

	var geomCabinShelf = new THREE.BoxGeometry(10,.5,2.5);
	var cabinShelf = new THREE.Mesh(geomCabinShelf, matBrown);
	cabinShelf.castShadow = true;
	cabinShelf.receiveShadow = true;	
	cabinShelf.position.set(0,11,1.5);
	cabinShelf.updateMatrix();
	geomBrownMerged.merge(cabinShelf.geometry, cabinShelf.matrix);

	//LifeSaver
	var geomLifeSaver = new THREE.TorusBufferGeometry( 3, 1, 10, 16 );
	var lifeSaver = new THREE.Mesh(geomLifeSaver, matOrange);
	lifeSaver.castShadow = true;
	lifeSaver.receiveShadow = true;	
	lifeSaver.position.set(0,15,18);
	lifeSaver.rotation.z = Math.PI/4;
	lifeSaver.scale.set(1,1,0.5);

	var geomLifeSaverBands = new THREE.BoxBufferGeometry(1.5,2.5,2.5);
	var lifeSaverBand1 = new THREE.Mesh(geomLifeSaverBands, matWhite);
	lifeSaverBand1.castShadow = true;
	lifeSaverBand1.receiveShadow = true;	
	lifeSaverBand1.position.set(0,2.85,0);
	lifeSaver.add(lifeSaverBand1);

	var lifeSaverBand2 = lifeSaverBand1.clone();
	lifeSaverBand2.castShadow = true;
	lifeSaverBand2.receiveShadow = true;
	lifeSaverBand2.rotation.z = Math.PI/2;
	lifeSaverBand2.position.set(2.85,-2.85,0);
	lifeSaverBand1.add(lifeSaverBand2);

	var lifeSaverBand3 = lifeSaverBand1.clone();
	lifeSaverBand3.castShadow = true;
	lifeSaverBand3.receiveShadow = true;
	lifeSaverBand3.rotation.z =Math.PI;
	lifeSaverBand3.position.set(0,-5.75,0);
	lifeSaverBand1.add(lifeSaverBand3);
	this.group.add(lifeSaver);


	//Chimney Stack
	var geomGreyMerged = new THREE.Geometry();


	var geomChimneyCol = new THREE.CylinderGeometry(0.75,0.75,18,8);
	var chimneyCol = new THREE.Mesh(geomChimneyCol, matDarkGrey);
	chimneyCol.position.set(5,14,16);	
	chimneyCol.updateMatrix();
	geomGreyMerged.merge(chimneyCol.geometry, chimneyCol.matrix);

	var geomChimneyTop = new THREE.CylinderGeometry(.75,2,2,8);
	var chimneyColTop = new THREE.Mesh(geomChimneyTop, matDarkGrey);
	chimneyColTop.position.set(7,27,16);
	chimneyColTop.updateMatrix();
	geomGreyMerged.merge(chimneyColTop.geometry, chimneyColTop.matrix);

	var geomChimneyColAngle = new THREE.CylinderGeometry(0.75,0.75,4,8);
	var chimneyColAngle = new THREE.Mesh(geomChimneyColAngle, matDarkGrey);
	chimneyColAngle.position.set(6,25,16);
	geomChimneyColAngle.applyMatrix(new THREE.Matrix4().makeRotationZ(-Math.PI/4));
	chimneyColAngle.updateMatrix();
	geomGreyMerged.merge(chimneyColAngle.geometry, chimneyColAngle.matrix);

	var geomChimneyStove = new THREE.CylinderGeometry(2.5,2.5,6,8);
	var chimneyStove = new THREE.Mesh(geomChimneyStove, matDarkGrey);
	chimneyStove.position.set(4,6,14);
	chimneyStove.updateMatrix();
	geomGreyMerged.merge(chimneyStove.geometry, chimneyStove.matrix);



	//AirHorn
	var matBrass = new THREE.MeshStandardMaterial({
		color:Colors.brass,
		emissive: Colors.brass,
		emissiveIntensity: 0.25,
		metalness: .3,
		roughness: .15,
		shading:THREE.FlatShading,
		wireframe:false
	});

	var geomHornLength = new THREE.CylinderBufferGeometry(.5,1,10,8);
	var hornLength = new THREE.Mesh(geomHornLength, matBrass);
	hornLength.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI/1.8));
	hornLength.castShadow = true;
	hornLength.receiveShadow = true;
	hornLength.position.set(-6,27,5);
	this.group.add(hornLength);

	var geomHornStop= new THREE.BoxBufferGeometry(1.5,1.5,1.5);
	var hornStop = new THREE.Mesh(geomHornStop, matDarkGrey);
	hornStop.castShadow = true;
	hornStop.receiveShadow = true;
	hornStop.position.set(0,5,0);
	hornLength.add(hornStop);


	var geomHornEnd = new THREE.CylinderGeometry(1,2,2,8);
	geomHornEnd.vertices[17].y+=1;
	var hornEnd= new THREE.Mesh(geomHornEnd, matBrass);
	hornEnd.castShadow = true;
	hornEnd.receiveShadow = true;
	hornEnd.position.set(0,-6,0);
	hornLength.add(hornEnd);

	//Engine Block
	this.engineBlock = new THREE.Group();
	this.engineBlock.position.set(0,2.5,23);
	var engineBlockOffset = new THREE.Group();
	engineBlockOffset.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, 4) );

	var geomEngineMain = new THREE.BoxBufferGeometry(5,11,3);
	geomEngineMain.applyMatrix( new THREE.Matrix4().makeTranslation(0, -1.5, 0) );
	var engineMain = new THREE.Mesh(geomEngineMain, matGrey);
	engineMain.castShadow = true;
	engineMain.receiveShadow = true;	
	engineBlockOffset.add(engineMain);

	var geomEngineUpper = new THREE.BoxBufferGeometry(5,3,6);
	var engineUpper = new THREE.Mesh(geomEngineUpper, matGrey);
	engineUpper.position.set(0,4.5,-1.5);
	engineMain.add(engineUpper);

	var geomEngineTop = new THREE.BoxGeometry(5,2,6);
	geomEngineTop.vertices[1].x-=1;
	geomEngineTop.vertices[4].x+=1;
	geomEngineTop.vertices[5].x+=1;	
	geomEngineTop.vertices[0].x-=1;	

	var engineTop = new THREE.Mesh(geomEngineTop, matRed);
	engineTop.castShadow = true;
	engineTop.receiveShadow = true;	
	engineTop.position.set(0,2.5,0);
	engineUpper.add(engineTop);

	//Propellor

	this.propellor = new THREE.Group();
	this.propellor.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	this.propellor.position.set(0,-6,2.5);
	this.propellor.scale.set(.6,.6,.6);

	var geomPropMerged = new THREE.Geometry();

	var geomPropCore = new THREE.CylinderGeometry( 2, 2, 4, 8, 1);
	var propCore = new THREE.Mesh(geomPropCore, matBrown);
	propCore.updateMatrix();
	geomPropMerged.merge(propCore.geometry, propCore.matrix);


	var geomPropBlade = new THREE.BoxGeometry( 3, .5, 5);
	var propBlade1 = new THREE.Mesh(geomPropBlade, matBrown);
	propBlade1.castShadow = true;
	propBlade1.receiveShadow = true;	
	propBlade1.position.set(0,0,-3.5);
	propBlade1.rotation.z = Math.PI/10;
	propBlade1.updateMatrix();
	geomPropMerged.merge(propBlade1.geometry, propBlade1.matrix);

	var propBlade2 = propBlade1.clone();
	propBlade2.position.set(3.5,0,0);
	propBlade2.rotation.y = Math.PI/2;
	propBlade2.rotation.z = -propBlade1.rotation.z;
	propBlade2.updateMatrix();
	geomPropMerged.merge(propBlade2.geometry, propBlade2.matrix);

	var propBlade3 = propBlade1.clone();
	propBlade3.position.set(0,0,3.5);
	propBlade3.rotation.z = -propBlade1.rotation.z;
	propBlade3.updateMatrix();
	geomPropMerged.merge(propBlade3.geometry, propBlade3.matrix);

	var propBlade4 = propBlade2.clone();
	propBlade4.position.set(-3.5,0,0);
	propBlade4.rotation.z = -propBlade2.rotation.z *2;
	propBlade4.updateMatrix();
	geomPropMerged.merge(propBlade4.geometry, propBlade4.matrix);

	var propMerged = new THREE.Mesh(geomPropMerged, matBrown);
	propMerged.castShadow = true;
	propMerged.receiveShadow = true;
	this.propellor.add(propMerged);


	engineBlockOffset.add(this.propellor);

	this.engineBlock.add(engineBlockOffset);

	this.group.add(this.engineBlock);

	var whiteGeom = new THREE.Mesh(geomWhiteMerged, matWhite);
	whiteGeom.castShadow = true;
	whiteGeom.receiveShadow = true;
	this.group.add(whiteGeom);

	var brownGeom = new THREE.Mesh(geomBrownMerged, matBrown);
	brownGeom.castShadow = true;
	brownGeom.receiveShadow = true;
	this.group.add(brownGeom);

	var blueGeom = new THREE.Mesh(geomBlueMerged, matBlueGlass);
	blueGeom.castShadow = true;
	blueGeom.receiveShadow = true;
	this.group.add(blueGeom);

	var greyGeom = new THREE.Mesh(geomGreyMerged, matDarkGrey);
	greyGeom.castShadow = true;
	greyGeom.receiveShadow = true;
	this.group.add(greyGeom);

	// Anchor Camera to Boat

	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
		);

	controls = new THREE.OrbitControls(camera, renderer.domElement);
	camera.position.set(0,30,100);

	cameraMesh.add(camera);

	cameraMesh.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, -24) );

	cameraMesh.add(this.group);

	this.mesh.add(cameraMesh);

}



Boat.prototype.swayBoat = function (){

	boat.group.rotation.z = Math.sin(Date.now() * 0.001) * Math.PI * 0.01 ;
	boat.group.rotation.x = Math.sin(Date.now() * 0.002) * Math.PI * 0.01 ;
	boat.group.rotation.y = Math.sin(Date.now() * 0.001) * Math.PI * 0.01 ;	
	boat.engineBlock.rotation.z = Math.sin(Date.now() * 0.05) * Math.PI * 0.005 ;
}



var beaconArray = [];
var seaGullArray = [];
var seaGullIslandArray = [];
var sea, boat, desertIsland, beacon, seaGull;


function createSea(){ 
	sea = new Sea();
	scene.add(sea.mesh);
	sea.mesh.castShadow = false;
	sea.mesh.receiveShadow = true;
}

function createBoat(){ 
	boat = new Boat();
	boat.mesh.position.set(-100,0.25,100);
	boat.mesh.scale.set(1,1,1);
	scene.add(boat.mesh);
}

function createBeacon(x,y,z){ 
	beacon = new Beacon();
	beacon.mesh.position.set(x, y, z);
	scene.add(beacon.mesh);
	beaconArray.push(beacon);
}

function createIsland(x,y,z){ 
	desertIsland = new DesertIsland();
	desertIsland.mesh.position.set(x,y,z);
	scene.add(desertIsland.mesh);
	createSeaGull(x-50, 50, z , .3);
	seaGullIslandArray.push(seaGull);
	createBeacon(x-150, 0.5, z+50);
}

function createSeaGull(x,y,z,s){ 
	seaGull = new SeaGull();
	seaGull.mesh.scale.set(s,s,s);
	seaGull.mesh.position.set(x, y, z);
	scene.add(seaGull.mesh);
	seaGullArray.push(seaGull);
}

function init() {

	createScene();
	createLights();

	createSea();
	createBoat();
	createIsland(-80,0,-300);
	createIsland(120,2,250);
	createIsland(-400,-2,300);
	createIsland(-650,-1.2,-300);
	createBeacon(-40, 0, 25);
	createSeaGull(200, 65, 100, .4);

	initSkybox();	
	loop();
}

function loop(e){
	sea.uniforms.uTime.value = e * 0.001;
	swayBeacon();
	flapWings();
	boat.swayBoat();

	renderer.render(scene, camera);
	requestAnimationFrame(loop);
	animation();
}

function animation (){
	var delta = clock.getDelta(); // seconds.

	//SEAGULL ANIMATIONS
	//////////////////////////

		var gullSpeed = 40 * delta;
		//Sea Gull Island Movement	
		for (var i = 0; i <seaGullIslandArray.length; i++){

			var turningCircle = -Math.PI /6 * delta;

			seaGullIslandArray[i].mesh.translateZ(-gullSpeed) ;
			seaGullIslandArray[i].mesh.rotateOnAxis( new THREE.Vector3(0,1,0), turningCircle);
		}

		//Sea Gull Free Movement	
		seaGull.mesh.translateZ(-(gullSpeed+.35)) ;
		seaGull.mesh.rotateOnAxis( new THREE.Vector3(0,1,0), Math.PI /15 * delta);


	//BOAT ANIMATIONS
	//////////////////////////

		var rotateAngle = Math.PI / 3.5 * delta; 
		var propellorAngle = -Math.PI * 4 * delta;   // degrees per second
		var moveDistance = 100 * delta; // 100 pixels per second

		//Engine Idle
		boat.propellor.rotateOnAxis( new THREE.Vector3(0,1,0), propellorAngle/8);

		//Engine Rotation
		var engineY = boat.engineBlock.rotation.y;
		var maxEngineY = .8;	


	//BOAT CONTROLS
	//////////////////////////

		if ( keyboard.pressed("W") ) {
			boat.mesh.translateZ( -moveDistance );

			boat.propellor.rotateOnAxis( new THREE.Vector3(0,1,0), propellorAngle);
		}	

		if ( keyboard.pressed("S") ) {
			boat.mesh.translateZ(  moveDistance );

			boat.propellor.rotateOnAxis( new THREE.Vector3(0,1,0), -propellorAngle);		
		}

		if ( keyboard.pressed("A") ) {
			setTimeout(function(){
				boat.mesh.rotateOnAxis( new THREE.Vector3(0,1,0), rotateAngle);
			}, 100);

			if (keyboard.pressed("S")) {
				boat.engineBlock.rotation.y = THREE.Math.clamp(engineY + (delta*2.5), -maxEngineY, maxEngineY);
			} else {
				boat.engineBlock.rotation.y = THREE.Math.clamp(engineY - (delta*2.5), -maxEngineY, maxEngineY);	
			}

			if ( ! (keyboard.pressed("W") || keyboard.pressed("S"))) {
				boat.propellor.rotateOnAxis( new THREE.Vector3(0,1,0), propellorAngle);
			}
		}

		if ( keyboard.pressed("D") ){
			setTimeout(function(){
				boat.mesh.rotateOnAxis( new THREE.Vector3(0,1,0), -rotateAngle);
			}, 100);

			if (keyboard.pressed("S")) {
				boat.engineBlock.rotation.y = THREE.Math.clamp(engineY - (delta*2.5), -maxEngineY, maxEngineY);
			} else {
				boat.engineBlock.rotation.y = THREE.Math.clamp(engineY + (delta*2.5), -maxEngineY, maxEngineY);
			}


			if ( ! (keyboard.pressed("W") || keyboard.pressed("S"))) {
				boat.propellor.rotateOnAxis( new THREE.Vector3(0,1,0), propellorAngle);
			}
		}

		// Steering Decay

		if ( ! ( keyboard.pressed("A") || keyboard.pressed("D") ) && ( keyboard.pressed("W") || keyboard.pressed("S") ) ) {

			if ( engineY > 0 ) {
				boat.engineBlock.rotation.y = THREE.Math.clamp( engineY - delta * 1.75, 0, maxEngineY );
			} else {
				boat.engineBlock.rotation.y = THREE.Math.clamp( engineY + delta * 1.75, - maxEngineY, 0 );
			}
		}

	controls.update();	
}
