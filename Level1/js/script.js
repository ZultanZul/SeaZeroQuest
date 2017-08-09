"use strict";

var Colors = {
	white:0xd8d0d1,
	grey:0xcccccc,
	green: 0x5bd46d,
	yellow: 0xd7de41,
	brown: 0x715337,
	red: 0xdf3636,
};

window.addEventListener('load', init, false);

var scene,
		camera, fieldOfView, aspectRatio, nearPlane, farPlane, HEIGHT, WIDTH,
		renderer, container, controls, particleSystem;

var keyboard = new THREEx.KeyboardState();
var clock = new THREE.Clock();

function createScene() {

	HEIGHT = window.innerHeight;
	WIDTH = window.innerWidth;
	scene = new THREE.Scene();

	scene.fog = new THREE.Fog (0x4ca7e6, 400, 800); 

	var axis = new THREE.AxisHelper(30);
	axis.position.set(0,5,0);
	scene.add(axis);

	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 10000;
	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
		);

	camera.position.set(0,150,400);
	camera.lookAt(scene.position);

	renderer = new THREE.WebGLRenderer({ 
		alpha: true, 
		antialias: true 
	});

	//controls = new THREE.OrbitControls(camera, renderer.domElement);

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

	shadowLight.position.set(-100,350,-350);
	shadowLight.castShadow = true;
	shadowLight.shadow.camera.left = -500;
	shadowLight.shadow.camera.right = 500;
	shadowLight.shadow.camera.top = 500;
	shadowLight.shadow.camera.bottom = -500;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 800;
	shadowLight.shadow.mapSize.width = 2056;
	shadowLight.shadow.mapSize.height = 2056;

	scene.add(shadowLight);
}

var Sea = function(ampValue, vertX, vertY, waveOpacity,textOffsetX, textOffsetY) {
	
	this.mesh = new THREE.Object3D();
	
	var geomWaves = new THREE.PlaneGeometry( 2000, 2000, vertX ,vertY );

	geomWaves.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	geomWaves.mergeVertices();
	var l = geomWaves.vertices.length;

	this.waves = [];
		for (var i=0; i<l; i++){
		var v = geomWaves.vertices[i];
		this.waves.push({y:v.y,
		 x:v.x,
		 z:v.z,
		ang:Math.random()*Math.PI*2,
		amp:ampValue,
		speed:0.016 + Math.random()*0.024
		});
	};
	var textWaves = new THREE.TextureLoader().load( "images/water.png" );
	textWaves.wrapS = THREE.RepeatWrapping;
	textWaves.wrapT = THREE.RepeatWrapping;
	textWaves.offset = new THREE.Vector2(textOffsetX, textOffsetY);
	textWaves.repeat.set( 110, 110 );

	var matWaves = new THREE.MeshPhongMaterial( {
		//color:0x307ddd,
		transparent: true,
		opacity: waveOpacity,
		map: textWaves,
		shading:THREE.SmoothShading,
	});

	this.mesh = new THREE.Mesh(geomWaves, matWaves);
}

Sea.prototype.moveWaves = function (){

	var verts = this.mesh.geometry.vertices;
	var l = verts.length;
	
	for (var i=0; i<l; i++){
		var v = verts[i];
		var vprops = this.waves[i];

		v.x = vprops.x + Math.cos(vprops.ang)*vprops.amp;
		v.y = vprops.y + Math.sin(vprops.ang)*vprops.amp;
		vprops.ang += vprops.speed;
	}
	this.mesh.geometry.verticesNeedUpdate=true;
}


var Boat = function() {
	
	this.mesh = new THREE.Object3D();

	this.group = new THREE.Group();

	var matGrey = new THREE.MeshPhongMaterial({color:Colors.grey, shading:THREE.SmoothShading, wireframe:false});
	var matWhite = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.SmoothShading, wireframe:false});
	var matRed = new THREE.MeshPhongMaterial({color:Colors.red, shading:THREE.SmoothShading, wireframe:false});
	var matBrown = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.SmoothShading, wireframe:false});

	var geomHull = new THREE.BoxGeometry(25,5,50,1,1,2);
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


	//Cabin

	var geomCabin = new THREE.BoxGeometry(15,5,10,1,1,1);
	var cabin = new THREE.Mesh(geomCabin, matBrown);
	cabin.castShadow = true;
	cabin.receiveShadow = true;	
	cabin.position.set(0,5,0);
	//hull.add(cabin);

	// Railing
	var geomRail = new THREE.BoxGeometry(1.5,3,1.5,);
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

	//Engine Block

	this.engineBlock = new THREE.Group();
	this.engineBlock.position.set(0,2,27);	
	var geomEngineMain = new THREE.BoxBufferGeometry(5,8.5,3);
	var engineMain = new THREE.Mesh(geomEngineMain, matGrey);
	engineMain.castShadow = true;
	engineMain.receiveShadow = true;	
	//engineMain.position.set(0,2,27);
	this.engineBlock.add(engineMain);

	var geomEngineUpper = new THREE.BoxBufferGeometry(5,3,6);
	var engineUpper = new THREE.Mesh(geomEngineUpper, matGrey);
	// engineUpper.castShadow = true;
	// engineUpper.receiveShadow = true;	
	engineUpper.position.set(0,5.5,-1.5);
	engineMain.add(engineUpper);

	var geomEngineTop = new THREE.BoxGeometry(5,2,6);
	geomEngineTop.vertices[1].x-=1;
	geomEngineTop.vertices[4].x+=1;
	geomEngineTop.vertices[5].x+=1;	
	geomEngineTop.vertices[0].x-=1;	

	var engineTop = new THREE.Mesh(geomEngineTop, matRed);
	// engineTop.castShadow = true;
	// engineTop.receiveShadow = true;	
	engineTop.position.set(0,2.5,0);
	engineUpper.add(engineTop);

	//Propellor
	this.propellor = new THREE.Group();
	this.propellor.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	this.propellor.position.set(0,-3,2.5);
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
	propBlade2.rotation.z = -propBlade1.rotation.z
	propCore.add(propBlade2);

	var propBlade3 = propBlade1.clone();
	propBlade3.position.set(0,0,3.5);
	propBlade3.rotation.z = -propBlade1.rotation.z
	propCore.add(propBlade3);

	var propBlade4 = propBlade2.clone();
	propBlade4.position.set(-3.5,0,0);
	propBlade4.rotation.z = -propBlade2.rotation.z
	propCore.add(propBlade4);

	this.engineBlock.add(this.propellor);
	this.group.add(this.engineBlock);



	this.group.add(hull);
	this.mesh.add(this.group);
}



Boat.prototype.swayBoat = function (){

	boat.group.rotation.z = Math.sin(Date.now() * 0.001) * Math.PI * 0.01 ;
	boat.group.rotation.x = Math.sin(Date.now() * 0.002) * Math.PI * 0.01 ;
	boat.group.rotation.y = Math.sin(Date.now() * 0.001) * Math.PI * 0.01 ;		
}


var Beacon = function(color) {

	this.mesh = new THREE.Object3D();

	var matRed = new THREE.MeshPhongMaterial({color:color, shading:THREE.FlatShading, wireframe:false});
	var matWhite = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading, wireframe:false});

	var geomBeaconBase = new THREE.CylinderBufferGeometry( 10, 10, 6, 10, 1);
	var beaconBase = new THREE.Mesh(geomBeaconBase, matRed);
	beaconBase.castShadow = true;
	beaconBase.receiveShadow = true;	
	this.mesh.add(beaconBase);

	var geomBeaconTower1 = new THREE.CylinderBufferGeometry( 6, 8, 10, 4, 1);
	var beaconTower1 = new THREE.Mesh(geomBeaconTower1, matRed);
	beaconTower1.position.set(0,7.5,0);
	beaconTower1.castShadow = true;
	beaconTower1.receiveShadow = true;	
	this.mesh.add(beaconTower1);

	var geomBeaconTower2 = new THREE.CylinderBufferGeometry( 4.5, 5.5, 6, 4, 1);
	var beaconTower2 = new THREE.Mesh(geomBeaconTower2, matWhite);
	beaconTower2.position.set(0,13,0);
	beaconTower2.castShadow = true;
	beaconTower2.receiveShadow = true;	
	this.mesh.add(beaconTower2);

	var geomBeaconTower3 = new THREE.CylinderBufferGeometry( 3.5, 5.5, 10, 4, 1);
	var beaconTower3 = new THREE.Mesh(geomBeaconTower3, matRed);
	beaconTower3.position.set(0,21,0);
	beaconTower3.castShadow = true;
	beaconTower3.receiveShadow = true;	
	this.mesh.add(beaconTower3);

	var geomBeaconTop = new THREE.SphereBufferGeometry( 5, 4, 5);
	var beaconTop = new THREE.Mesh(geomBeaconTop, matRed);
	beaconTop.position.set(0,29,0);
	beaconTop.castShadow = true;
	beaconTop.receiveShadow = true;	
	this.mesh.add(beaconTop);
}

Beacon.prototype.swayBeacon = function (){

	beacon.mesh.rotation.z = Math.sin(Date.now() * 0.0008) * Math.PI * 0.05 ;
	beacon.mesh.rotation.x = Math.sin(Date.now() * 0.001) * Math.PI * 0.02 ;
	beacon.mesh.rotation.y = Math.sin(Date.now() * 0.0009) * Math.PI * 0.03 ;		
}

var beaconArray = [];
var nBeacons = 25;
	
// Randomly Scatter Beacons through the Scene on a 1400x1400 Grid

var ScatterBeacons = function(){

	this.mesh = new THREE.Object3D();

	for(var i=0; i<nBeacons; i++){
	
		var b = new Beacon(Colors.red);
		var min = -700;
		var max = 700;
		b.mesh.position.z = Math.random() * (max - min) + min;
		b.mesh.position.x = Math.random() * (max - min) + min;
		b.mesh.rotation.y = 0+Math.random()*20;
		beaconArray.push(b);
		this.mesh.add(b.mesh);
	}
}

var swayBeacon = function (){

	for (var i = 0; i <nBeacons; i++){
		var min = 0.005;
		var max = 0.01;
		var offset = Math.random() * (max - min) + min;
	 	beaconArray[i].mesh.rotation.z = Math.sin(Date.now() * 0.0008)  * Math.PI * 0.05 ;
		beaconArray[i].mesh.rotation.x = Math.sin(Date.now() * 0.001 + offset)  * Math.PI * 0.02 ;
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


var lowerSea;
var sea;
var boat;
var beacon;
var scatteredBeacons;

function createSea(){ 
	sea = new Sea(1.7, 100, 100, 0.85, 0, 0);
	scene.add(sea.mesh);
	sea.mesh.castShadow = false;
	sea.mesh.receiveShadow = true;
}

function createLowerSea(){ 
	lowerSea = new Sea(1.2, 10, 10, 1, 0.5, 0);
	lowerSea.mesh.position.y = -6;
	lowerSea.mesh.castShadow = false;
	lowerSea.mesh.receiveShadow = false;
	scene.add(lowerSea.mesh);
}

function createBoat(){ 
	boat = new Boat();
	boat.mesh.position.set(0,0,0);
	boat.mesh.scale.set(1,1,1);
	scene.add(boat.mesh);
}
function createBeacon(){ 
	beacon = new Beacon(Colors.yellow);
	beacon.mesh.position.set(40, 0, -75);
	scene.add(beacon.mesh);
}

function scatterBeacons(){ 
	scatteredBeacons = new ScatterBeacons();
	scene.add(scatteredBeacons.mesh);
}

function init() {

	createScene();
	createLights();
	createSea();
	createLowerSea();
	createBoat();
	createBeacon();
	scatterBeacons();
	initSkybox();
	loop();
}

function loop(){

	renderer.render(scene, camera);

	sea.moveWaves();
	lowerSea.moveWaves();
	boat.swayBoat();
	beacon.swayBeacon();
	swayBeacon();

	requestAnimationFrame(loop);
	update();
}

function update (){

	var delta = clock.getDelta(); // seconds.
	var moveDistance = 100 * delta; // 100 pixels per second
	var rotateAngle = Math.PI / 4 * delta;   // pi/2 radians (90 degrees) per second	
	var propellorAngle = Math.PI * 4 * delta;   // 360 degrees per second
	var engineAngle = Math.PI * 4;

	var speed;
	
	if ( keyboard.pressed("W") )
		boat.mesh.translateZ( -moveDistance );
	if ( keyboard.pressed("W") )
		boat.propellor.rotateOnAxis( new THREE.Vector3(0,1,0), propellorAngle);

	if ( keyboard.pressed("S") )
		boat.mesh.translateZ(  moveDistance );
	if ( keyboard.pressed("S") )
		boat.propellor.rotateOnAxis( new THREE.Vector3(0,1,0), -propellorAngle);

	// rotate left/right/up/down
	var rotation_matrix = new THREE.Matrix4().identity();
	if ( keyboard.pressed("A") )
		boat.mesh.rotateOnAxis( new THREE.Vector3(0,1,0), rotateAngle);
	if ( keyboard.pressed("A") )
		boat.engineBlock.rotateOnAxis( new THREE.Vector3(0,1,0), -engineAngle);

	if ( keyboard.pressed("D") )
		boat.mesh.rotateOnAxis( new THREE.Vector3(0,1,0), -rotateAngle);
	if ( keyboard.pressed("D") )
		boat.engineBlock.rotateOnAxis( new THREE.Vector3(0,1,0), engineAngle);

	var relativeCameraOffset = new THREE.Vector3(0,60,150);

	var cameraOffset = relativeCameraOffset.applyMatrix4( boat.mesh.matrixWorld );

	camera.position.x = cameraOffset.x;
	camera.position.y = cameraOffset.y;
	camera.position.z = cameraOffset.z;
	camera.lookAt( boat.mesh.position );

	//controls.update();	
}
