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

	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 4000;


	//Build Camera

	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
		);

	camera.position.set(0,30,150);

	renderer = new THREE.WebGLRenderer({ 
		alpha: true, 
		antialias: true 
	});

	controls = new THREE.OrbitControls(camera, renderer.domElement);

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

	this.mesh.add(seaBed);
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

	var geomBeaconBase = new THREE.CylinderGeometry( 10, 10, 6, 10, 1);
	var beaconBase = new THREE.Mesh(geomBeaconBase, matRed);
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
	createBeacon(x-150, 0, z+50);
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
	createIsland(0,0,-300);
	createBeacon(0, -0.5, 25);
	createSeaGull(200, 65, 100, .4);
	initSkybox();
	loop();
}

function loop(e){
	sea.uniforms.uTime.value = e * 0.001;
	swayBeacon();
	flapWings();

	renderer.render(scene, camera);
	requestAnimationFrame(loop);
	update();
}

function update (){

	var delta = clock.getDelta(); // seconds.

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

	controls.update();	
}
