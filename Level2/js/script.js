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



var Boat = function() {
	
	this.mesh = new THREE.Object3D();

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



	var geomHull = new THREE.BoxGeometry(25,7,50,1,1,2);
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
	geomHull.applyMatrix( new THREE.Matrix4().makeTranslation(0, -1, 0) );
	var hull = new THREE.Mesh(geomHull, matWhite);
	hull.position.set(0,0,0);
	hull.castShadow = true;
	hull.receiveShadow = true;	


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
	lowerRail.castShadow = true;
	lowerRail.receiveShadow = true;	
	hull.add(lowerRail);


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
	upperRail.castShadow = true;
	lowerRail.receiveShadow = true;	
	hull.add(upperRail);


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
	hull.add(rope);

	// Boyes
	var geomBoatBoye = new THREE.SphereBufferGeometry(3,8,8);
	var boatBoye = new THREE.Mesh(geomBoatBoye, matRed);
	boatBoye.castShadow = true;
	boatBoye.receiveShadow = true;	
	geomBoatBoye.applyMatrix( new THREE.Matrix4().makeTranslation(0, -3, 0) );
	boatBoye.position.set(14,6,0);
	boatBoye.rotation.z = Math.PI/8;
	hull.add(boatBoye);	 

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
	hull.add(boatBoye2);	 

	// Railing
	var geomRail = new THREE.BoxBufferGeometry(1.5,3,1.5,);
	var rail1 = new THREE.Mesh(geomRail, matBrown);
	rail1.castShadow = true;
	rail1.receiveShadow = true;	
	rail1.position.set(11,7,23.5);
	hull.add(rail1);

	var rail2 = rail1.clone();
	rail2.castShadow = true;
	rail2.receiveShadow = true;	
	rail2.position.set(-6,7,23.5);
	hull.add(rail2);

	var rail3 = rail1.clone();
	rail3.castShadow = true;
	rail3.receiveShadow = true;	
	rail3.position.set(6,7,23.5);
	hull.add(rail3);

	var rail4 = rail1.clone();
	rail4.castShadow = true;
	rail4.receiveShadow = true;	
	rail4.position.set(-11,7,23.5);
	hull.add(rail4);

	var railRep = rail1.clone();
	railRep.castShadow = true;
	railRep.receiveShadow = true;	
	railRep.position.set(-11,7,14);
	hull.add(railRep);

	var rail5 = rail1.clone();
	rail5.castShadow = true;
	rail5.receiveShadow = true;	
	rail5.position.set(22,0,0);
	railRep.add(rail5);

	var railRep2 = railRep.clone();
	railRep2.castShadow = true;
	railRep2.receiveShadow = true;	
	railRep2.position.set(-11,7,2);
	hull.add(railRep2);

	var railRep3 = railRep.clone();
	railRep3.castShadow = true;
	railRep3.receiveShadow = true;	
	railRep3.position.set(-11,7,-9.5);
	hull.add(railRep3);

	var rail6 = rail1.clone();
	rail6.castShadow = true;
	rail6.receiveShadow = true;	
	rail6.position.set(-5.5,7,-17);
	rail6.rotation.y = Math.PI/3.5;
	hull.add(rail6);

	var rail7 = rail1.clone();
	rail7.castShadow = true;
	rail7.receiveShadow = true;	
	rail7.position.set(5.5,7,-17);
	rail7.rotation.y = Math.PI/3.5;
	hull.add(rail7);

	var rail8 = rail1.clone();
	rail8.castShadow = true;
	rail8.receiveShadow = true;	
	rail8.position.set(0,7,-24);
	rail8.rotation.y = Math.PI/4;
	hull.add(rail8);


	//Cabin
	var cabin = new THREE.Group();	
	cabin.position.set(0,13,10);

	var geomCabinCorner = new THREE.BoxBufferGeometry(2,24,2);
	var cabinCorner1 = new THREE.Mesh(geomCabinCorner, matBrown);
	cabinCorner1.castShadow = true;
	cabinCorner1.receiveShadow = true;	
	cabinCorner1.position.set(7,1,-7);
	cabin.add(cabinCorner1);

	var cabinCorner2 = cabinCorner1.clone();
	cabinCorner2.castShadow = true;
	cabinCorner2.receiveShadow = true;	
	cabinCorner2.position.set(-7,1,-7);
	cabin.add(cabinCorner2);

	var geomCabinCornerShort = new THREE.BoxBufferGeometry(2,22,2);
	var cabinCorner3 = new THREE.Mesh(geomCabinCornerShort, matBrown);
	cabinCorner3.castShadow = true;
	cabinCorner3.receiveShadow = true;	
	cabinCorner3.position.set(-7,0,7);
	cabin.add(cabinCorner3);

	var cabinCorner4 = cabinCorner3.clone();
	cabinCorner4.castShadow = true;
	cabinCorner4.receiveShadow = true;	
	cabinCorner4.position.set(7,0,7);
	cabin.add(cabinCorner4);

	//Cabin Roof
	var geomCabinRoof = new THREE.BoxGeometry(20,1,20, 2,1,1);
	geomCabinRoof.vertices[8].y+=.5;
	geomCabinRoof.vertices[9].y+=.5;
	geomCabinRoof.vertices[10].y+=.5;
	geomCabinRoof.vertices[11].y+=.5;
	var cabinRoof = new THREE.Mesh(geomCabinRoof, matWhite);
	cabinRoof.castShadow = true;
	cabinRoof.receiveShadow = false;	
	cabinRoof.position.set(0,12,0);
	cabinRoof.rotation.x = Math.PI/20;
	cabin.add(cabinRoof);

	var geomRoofCrest = new THREE.BoxGeometry(5,0.5,20, 2,1,1);
	geomRoofCrest.vertices[8].y+=.5;
	geomRoofCrest.vertices[9].y+=.5;
	var roofCrest = new THREE.Mesh(geomRoofCrest, matGrey);
	roofCrest.castShadow = false;
	roofCrest.receiveShadow = true;	
	roofCrest.position.set(0,1,0);
	cabinRoof.add(roofCrest);

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
	cabinSideWallR.castShadow = true;
	cabinSideWallR.receiveShadow = true;	
	cabinSideWallR.position.set(6.5,0,0);
	cabin.add(cabinSideWallR);

		//Cabin SideWindows	
		var geomCabinSideWindowFrame = new THREE.CylinderGeometry(4,4,1.5,20);
		var geomCabinSideWindowFrameCut = new THREE.CylinderGeometry(3.5,3.5,1.5,20);
		var geomCabinSideWindowFrameBSP = new ThreeBSP(geomCabinSideWindowFrame);
		var geomCabinSideWindowFrameCutBSP = new ThreeBSP(geomCabinSideWindowFrameCut);
		var CabinSideWindowFrameIntersectionBSP = geomCabinSideWindowFrameBSP.subtract(geomCabinSideWindowFrameCutBSP);  	
		var cabinSideWindowFrame = CabinSideWindowFrameIntersectionBSP.toMesh(matGrey);
		cabinSideWindowFrame.castShadow = true;
		cabinSideWindowFrame.receiveShadow = true;	
		cabinSideWindowFrame.applyMatrix(new THREE.Matrix4().makeRotationZ(-Math.PI/2));
		cabinSideWindowFrame.position.set(0,4,0);
		cabinSideWallR.add(cabinSideWindowFrame);


		var geomCabinSideWindow = new THREE.CylinderBufferGeometry(3.5,3.5,1,20);
		var cabinSideWindow = new THREE.Mesh(geomCabinSideWindow, matBlueGlass);
		cabinSideWindow.castShadow = false;
		cabinSideWindow.receiveShadow = true;	
		cabinSideWindow.position.set(0,0,0);
		cabinSideWindowFrame.add(cabinSideWindow);

		var cabinSideWallL = cabinSideWallR.clone();
		cabinSideWallL.castShadow = true;
		cabinSideWallL.receiveShadow = true;	
		cabinSideWallL.position.set(-6.5,0,0);
		cabin.add(cabinSideWallL);


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

	cabinFrontWall.castShadow = true;
	cabinFrontWall.receiveShadow = true;	
	cabinFrontWall.position.set(0,1.5,-6.5);

	cabin.add(cabinFrontWall);

	var geomCabinBackWall = new THREE.BoxGeometry(12,22,1);
	var geomCabinBackWallCut = new THREE.BoxGeometry(8,16,1);
	geomCabinBackWallCut.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, 0));
	var CabinBackWallBSP = new ThreeBSP(geomCabinBackWall);
	var CabinBackWallCutBSP = new ThreeBSP(geomCabinBackWallCut);
	var CabinBackWallIntersectionBSP = CabinBackWallBSP.subtract(CabinBackWallCutBSP);  	
	var cabinBackWall = CabinBackWallIntersectionBSP.toMesh(matWhite);
	cabinBackWall.castShadow = true;
	cabinBackWall.receiveShadow = true;	
	cabinBackWall.position.set(0,0,6.5);
	cabin.add(cabinBackWall);

	var geomCabinDoor = new THREE.BoxGeometry(8,16,1);
	var geomCabinDoorCut = new THREE.CylinderGeometry(2,2,1,20);
	geomCabinDoorCut.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	geomCabinDoorCut.applyMatrix(new THREE.Matrix4().makeTranslation(0, 2, 0));	
	var CabinDoorBSP = new ThreeBSP(geomCabinDoor);
	var CabinDoorCutBSP = new ThreeBSP(geomCabinDoorCut);
	var CabinDoorlIntersectionBSP = CabinDoorBSP.subtract(CabinDoorCutBSP);  
	var cabinDoor = CabinDoorlIntersectionBSP.toMesh(matGrey);

	var geomCabinDoorWindow = new THREE.CylinderBufferGeometry(2,2,1,20);
	geomCabinDoorWindow.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	geomCabinDoorWindow.applyMatrix(new THREE.Matrix4().makeTranslation(0, 2, 0));	
	var cabinDoorWindow = new THREE.Mesh(geomCabinDoorWindow, matBlueGlass);
	cabinDoorWindow.castShadow = false;
	cabinDoorWindow.receiveShadow = true;	
	cabinDoorWindow.position.set(0,0,0);
	cabinDoor.add(cabinDoorWindow);

	cabinDoor.castShadow = true;
	cabinDoor.receiveShadow = true;	
	cabinDoor.position.set(0,0,1);
	cabinBackWall.add(cabinDoor);

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
	cabinFrontWindowFrame.castShadow = true;
	cabinFrontWindowFrame.receiveShadow = true;	
	cabinFrontWindowFrame.position.set(0,3,0);
	cabinFrontWall.add(cabinFrontWindowFrame);

	var geomCabinFrontWindow = new THREE.BoxGeometry(8,11,1,5);
	geomCabinFrontWindow.vertices[0].y-=2.5;
	geomCabinFrontWindow.vertices[1].y-=2.5;
	geomCabinFrontWindow.vertices[4].y-=2.5;
	geomCabinFrontWindow.vertices[5].y-=2.5;
	var cabinFrontWindow = new THREE.Mesh(geomCabinFrontWindow, matBlueGlass);
	cabinFrontWindow.castShadow = false;
	cabinFrontWindow.receiveShadow = true;	
	cabinFrontWindow.position.set(0,0,0);
	cabinFrontWindowFrame.add(cabinFrontWindow);

	var geomCabinShelf = new THREE.BoxGeometry(10,.5,2.5);
	var cabinShelf = new THREE.Mesh(geomCabinShelf, matBrown);
	cabinShelf.castShadow = true;
	cabinShelf.receiveShadow = true;	
	cabinShelf.position.set(0,-6.25,-1);
	cabinFrontWindowFrame.add(cabinShelf);

	//LifeSaver
	var geomLifeSaver = new THREE.TorusBufferGeometry( 3, 1, 10, 16 );
	var lifeSaver = new THREE.Mesh(geomLifeSaver, matOrange);
	lifeSaver.castShadow = true;
	lifeSaver.receiveShadow = true;	
	lifeSaver.position.set(0,2,8);
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
	cabin.add(lifeSaver);


	//Chimney Stack
	var geomChimneyCol = new THREE.CylinderBufferGeometry(0.75,0.75,18,8);
	var chimneyCol = new THREE.Mesh(geomChimneyCol, matDarkGrey);
	chimneyCol.castShadow = true;
	chimneyCol.receiveShadow = true;	
	chimneyCol.position.set(5,2,5.5);	

	var geomChimneyTop = new THREE.CylinderBufferGeometry(.75,2,2,8);
	var chimneyColTop = new THREE.Mesh(geomChimneyTop, matDarkGrey);
	chimneyColTop.castShadow = true;
	chimneyColTop.receiveShadow = true;
	chimneyColTop.position.set(2,12,0);
	chimneyCol.add(chimneyColTop);

	var geomChimneyColAngle = new THREE.CylinderBufferGeometry(0.75,0.75,4,8);
	var chimneyColAngle = new THREE.Mesh(geomChimneyColAngle, matDarkGrey);
	chimneyColAngle.castShadow = true;
	chimneyColAngle.receiveShadow = true;	
	chimneyColAngle.position.set(1.5,10.5,0);
	geomChimneyColAngle.applyMatrix(new THREE.Matrix4().makeRotationZ(-Math.PI/4));
	chimneyCol.add(chimneyColAngle);

	var geomChimneyStove = new THREE.CylinderBufferGeometry(2.5,2.5,6,8);
	var chimneyStove = new THREE.Mesh(geomChimneyStove, matDarkGrey);
	chimneyStove.castShadow = true;
	chimneyStove.receiveShadow = true;	
	chimneyStove.position.set(-1.5,-12,-1);
	chimneyCol.add(chimneyStove);
	cabin.add(chimneyCol);


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
	hornLength.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI/1.95));
	hornLength.castShadow = true;
	hornLength.receiveShadow = true;
	hornLength.position.set(-6,1.5,-4);
	cabinRoof.add(hornLength);

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

	hull.add(cabin);


	//Engine Block
	this.engineBlock = new THREE.Group();
	this.engineBlock.position.set(0,1.5,23);
	var engineBlockOffset = new THREE.Group();
	engineBlockOffset.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, 4) );

	var geomEngineMain = new THREE.BoxBufferGeometry(5,14,3);
	var engineMain = new THREE.Mesh(geomEngineMain, matGrey);
	engineMain.castShadow = true;
	engineMain.receiveShadow = true;	
	engineBlockOffset.add(engineMain);

	var geomEngineUpper = new THREE.BoxBufferGeometry(5,3,6);
	var engineUpper = new THREE.Mesh(geomEngineUpper, matGrey);
	engineUpper.position.set(0,5.5,-1.5);
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

	var geomPropCore = new THREE.CylinderBufferGeometry( 2, 2, 4, 8, 1);
	var propCore = new THREE.Mesh(geomPropCore, matBrown);
	propCore.castShadow = true;
	propCore.receiveShadow = true;	
	this.propellor.add(propCore);

	var geomPropBlade = new THREE.BoxBufferGeometry( 3, .5, 5);
	var propBlade1 = new THREE.Mesh(geomPropBlade, matBrown);
	propBlade1.castShadow = true;
	propBlade1.receiveShadow = true;	
	propBlade1.position.set(0,0,-3.5);
	propBlade1.rotation.z = Math.PI/10;
	propCore.add(propBlade1);

	var propBlade2 = propBlade1.clone();
	propBlade2.position.set(3.5,0,0);
	propBlade2.rotation.y = Math.PI/2;
	propBlade2.rotation.z = -propBlade1.rotation.z;
	propCore.add(propBlade2);

	var propBlade3 = propBlade1.clone();
	propBlade3.position.set(0,0,3.5);
	propBlade3.rotation.z = -propBlade1.rotation.z;
	propCore.add(propBlade3);

	var propBlade4 = propBlade2.clone();
	propBlade4.position.set(-3.5,0,0);
	propBlade4.rotation.z = -propBlade2.rotation.z *2;
	propCore.add(propBlade4);

	engineBlockOffset.add(this.propellor);

	this.engineBlock.add(engineBlockOffset);

	this.group.add(this.engineBlock);

	this.group.add(hull);

	// Anchor Camera to Boat

	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
		);

	controls = new THREE.OrbitControls(camera, renderer.domElement);
	camera.position.set(0,30,100);
	this.group.add(camera);

	this.group.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, -24) );
	this.mesh.add(this.group);

}

Boat.prototype.swayBoat = function (){

	boat.group.rotation.z = Math.sin(Date.now() * 0.001) * Math.PI * 0.01 ;
	boat.group.rotation.x = Math.sin(Date.now() * 0.002) * Math.PI * 0.01 ;
	boat.group.rotation.y = Math.sin(Date.now() * 0.001) * Math.PI * 0.01 ;	
	boat.engineBlock.rotation.z = Math.sin(Date.now() * 0.05) * Math.PI * 0.005 ;
}

function DesertIsland(){
	this.mesh = new THREE.Object3D();
	var island = new THREE.Group();

	var matYellow = new THREE.MeshPhongMaterial({color:Colors.yellow, shading:THREE.FlatShading, wireframe:false});

	var geomSandBank2 = new THREE.SphereBufferGeometry( 150, 10, 10 );
	geomSandBank2.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, 0) );
	var sandBank2 = new THREE.Mesh(geomSandBank2, matYellow);

	var geomSandBank = new THREE.SphereBufferGeometry( 150, 10, 10 );
	geomSandBank.applyMatrix( new THREE.Matrix4().makeTranslation(30, 0, 40) );
	geomSandBank.applyMatrix( new THREE.Matrix4().makeScale(1.3,0.3,1) );
	sandBank2.updateMatrix();
	
	geomSandBank.merge(sandBank2.geometry,sandBank2.matrix);

	var sandBank = new THREE.Mesh( geomSandBank, matYellow );
	sandBank.position.set(0, -30,0);
	sandBank.castShadow = false;
	sandBank.receiveShadow = true;	
	island.add(sandBank);


	this.mesh.add(island);
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


var sea, boat, desertIsland;


function createSea(){ 
	sea = new Sea();
	scene.add(sea.mesh);
	sea.mesh.castShadow = false;
	sea.mesh.receiveShadow = true;
}

function createIsland(x,y,z){ 
	desertIsland = new DesertIsland();
	desertIsland.mesh.position.set(x,y,z);
	scene.add(desertIsland.mesh);
}

function createBoat(){ 
	boat = new Boat();
	//boat.mesh.position.set(-100,0,100);
	boat.mesh.position.set(0,.5,0);
	boat.mesh.scale.set(1,1,1);
	scene.add(boat.mesh);
}

function init() {

	createScene();
	createLights();
	createSea();
	// createIsland(-80,0,-300);
	createIsland(0,0,-100);
	initSkybox();
	loop();
}

function loop(e){
	controls.update();	
	renderer.render(scene, camera);
	sea.uniforms.uTime.value = e * 0.001;
	requestAnimationFrame(loop);

}
