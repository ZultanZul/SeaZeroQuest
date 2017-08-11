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
	//scene.add(axis);

	aspectRatio = WIDTH / HEIGHT;
	fieldOfView = 60;
	nearPlane = 1;
	farPlane = 10000;


	//Build Camera

	// camera = new THREE.PerspectiveCamera(
	// 	fieldOfView,
	// 	aspectRatio,
	// 	nearPlane,
	// 	farPlane
	// 	);

	// camera.position.set(0,30,100);

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
	shadowLight.shadow.camera.left = -500;
	shadowLight.shadow.camera.right = 500;
	shadowLight.shadow.camera.top = 500;
	shadowLight.shadow.camera.bottom = -500;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;
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
	textWaves.repeat.set( 90, 90 );

	var matWaves = new THREE.MeshPhongMaterial( {
		//color:0x307ddd,
		transparent: true,
		opacity: waveOpacity,
		map: textWaves,
		shading:THREE.SmoothShading,
	});

	this.mesh = new THREE.Mesh(geomWaves, matWaves);
}

var SeaBed= function() {
	
	this.mesh = new THREE.Object3D();
	
	var geomSeaBed = new THREE.PlaneGeometry( 2000, 2000);

	geomSeaBed.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
	var matWaves = new THREE.MeshPhongMaterial( {
		color:0x307ddd,
		shading:THREE.SmoothShading,
	});
	this.mesh = new THREE.Mesh(geomSeaBed, matWaves);
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
	var matLightBrown = new THREE.MeshPhongMaterial({color:Colors.lightBrown, shading:THREE.SmoothShading, wireframe:false});
	var matLightGreen = new THREE.MeshPhongMaterial({color:Colors.lightGreen, shading:THREE.SmoothShading, wireframe:false});
	var matYellow = new THREE.MeshPhongMaterial({color:Colors.yellow, shading:THREE.SmoothShading, wireframe:false});
	var matBlueGlass = new THREE.MeshPhongMaterial({color:Colors.blue, shading:THREE.SmoothShading,	transparent: true, opacity: .6, wireframe:false});
	var matOrange = new THREE.MeshPhongMaterial({color:Colors.orange, shading:THREE.SmoothShading, wireframe:false});


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


	var geomCabinFrontWall = new THREE.BoxGeometry(12,24,1);
	var geomCabinFrontWallCut = new THREE.BoxGeometry(9,12,1);
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
	//geomCabinBackWallCut.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, 0));
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
	var geomCabinFrontWindowFrame = new THREE.BoxGeometry(9,12,1.5);
	var geomCabinFrontWindowFrameCut = new THREE.BoxGeometry(8,11,1.5);
	var geomCabinFrontWindowFrameBSP = new ThreeBSP(geomCabinFrontWindowFrame);
	var geomCabinFrontWindowFrameCutBSP = new ThreeBSP(geomCabinFrontWindowFrameCut);
	var CabinFrontWindowFrameIntersectionBSP = geomCabinFrontWindowFrameBSP.subtract(geomCabinFrontWindowFrameCutBSP);  	
	var cabinFrontWindowFrame = CabinFrontWindowFrameIntersectionBSP.toMesh(matGrey);
	cabinFrontWindowFrame.castShadow = true;
	cabinFrontWindowFrame.receiveShadow = true;	
	cabinFrontWindowFrame.position.set(0,3,0);
	cabinFrontWall.add(cabinFrontWindowFrame);

	var geomCabinFrontWindow = new THREE.BoxBufferGeometry(8,11,1);
	var cabinFrontWindow = new THREE.Mesh(geomCabinFrontWindow, matBlueGlass);
	cabinFrontWindow.castShadow = false;
	cabinFrontWindow.receiveShadow = true;	
	cabinFrontWindow.position.set(0,0,0);
	cabinFrontWindowFrame.add(cabinFrontWindow);

	var geomCabinShelf = new THREE.BoxGeometry(10,.5,2.5);
	var cabinShelf = new THREE.Mesh(geomCabinShelf, matBrown);
	cabinShelf.castShadow = true;
	cabinShelf.receiveShadow = true;	
	cabinShelf.position.set(0,-6.25,-.5);
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

	hull.add(cabin);



	//Engine Block
	this.engineBlock = new THREE.Group();
	this.engineBlock.position.set(0,2,23);
	var engineBlockOffset = new THREE.Group();
	engineBlockOffset.applyMatrix( new THREE.Matrix4().makeTranslation(0, 0, 4) );

	var geomEngineMain = new THREE.BoxBufferGeometry(5,8.5,3);
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
}


var Beacon = function(color1, color2) {

	this.mesh = new THREE.Object3D();

	var matRed = new THREE.MeshPhongMaterial({color:color1, shading:THREE.FlatShading, wireframe:false});
	var matWhite = new THREE.MeshPhongMaterial({color:color2, shading:THREE.FlatShading, wireframe:false});

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
var nBeacons = 15;
	
// Randomly Scatter Beacons through the Scene on a 1400x1400 Grid

var ScatterBeacons = function(){

	this.mesh = new THREE.Object3D();

	for(var i=0; i<nBeacons; i++){
	
		var b = new Beacon(Colors.red,Colors.white);
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



function DesertIsland(){
	this.mesh = new THREE.Object3D();
	var island = new THREE.Group();
	island.position.set(0, 0, 0);

	var matYellow = new THREE.MeshPhongMaterial({color:Colors.yellow, shading:THREE.FlatShading, wireframe:false});
	var matGrey = new THREE.MeshPhongMaterial({color:Colors.darkGrey, shading:THREE.SmoothShading, wireframe:false});
	var matBrown = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.SmoothShading, wireframe:false});
	var matGreen = new THREE.MeshPhongMaterial({color:Colors.green, shading:THREE.FlatShading, wireframe:false});


	var geomSandBank = new THREE.SphereBufferGeometry( 150, 10, 10 );
	var sandBank = new THREE.Mesh( geomSandBank, matYellow );
	sandBank.position.set(0, -30, 0);
	sandBank.scale.set(1,0.3,1);
	sandBank.castShadow = false;
	sandBank.receiveShadow = true;	
	island.add(sandBank);

	var geomSandBankExtend1 = new THREE.SphereBufferGeometry( 150, 10, 10 );
	var sandBankExtend1 = new THREE.Mesh( geomSandBankExtend1, matYellow );
	sandBankExtend1.position.set(30, 0, 40);
	sandBankExtend1.scale.set(1.3,.9,1);
	sandBankExtend1.castShadow = false;
	sandBankExtend1.receiveShadow = true;	
	sandBank.add(sandBankExtend1);

	var geomBoulderLarge = new THREE.DodecahedronBufferGeometry(20,0);
	var boulderLarge = new THREE.Mesh( geomBoulderLarge, matGrey );
	boulderLarge.position.set(-10, 22, 0);
	boulderLarge.rotation.z = Math.PI/10;
	boulderLarge.castShadow = true;
	boulderLarge.receiveShadow = true;	
	island.add(boulderLarge);

	//Scatter Small boulders
	for(var i=0; i<15; i++){

		var b = new THREE.Mesh( geomBoulderLarge, matGrey );
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
		island.add(b);
	}

	var palmTree = new THREE.Group();
	palmTree.position.set(50,16,0);

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
	palmTrunkSeg.castShadow = true;
	palmTrunkSeg.receiveShadow = true;		
	palmTree.add(palmTrunkSeg);	

	var palmTrunkSeg2 = palmTrunkSeg.clone();
	palmTrunkSeg2.position.y += 9;
	palmTrunkSeg2.position.x -= .5;
	palmTrunkSeg2.rotation.z += 0.2;	
	//palmTrunkSeg2.rotation.y += 0.2;
	palmTree.add(palmTrunkSeg2);	

	var palmTrunkSeg3 = palmTrunkSeg2.clone();
	palmTrunkSeg3.position.y += 9;
	palmTrunkSeg3.position.x -= 2;
	palmTrunkSeg3.rotation.y -= 0.2;
	palmTree.add(palmTrunkSeg3);

	var palmTrunkSeg4 = palmTrunkSeg3.clone();
	palmTrunkSeg4.position.y += 8.5;
	palmTrunkSeg4.position.x -= 3;
	palmTrunkSeg4.rotation.z += 0.2;
	palmTrunkSeg4.rotation.y += 0.2;
	palmTree.add(palmTrunkSeg4);

	var palmTrunkSeg5 = palmTrunkSeg4.clone();
	palmTrunkSeg5.position.y += 8;
	palmTrunkSeg5.position.x -= 4;
	//palmTrunkSeg5.rotation.y += 0.2;
	palmTree.add(palmTrunkSeg5);

	var palmTrunkSeg6 = palmTrunkSeg5.clone();
	palmTrunkSeg6.position.y += 8;
	palmTrunkSeg6.position.x -= 4;
	palmTrunkSeg6.rotation.z += 0.2;
	palmTree.add(palmTrunkSeg6);

	var palmTrunkSeg7 = palmTrunkSeg6.clone();
	palmTrunkSeg7.position.y += 7;
	palmTrunkSeg7.position.x -= 6;
	palmTrunkSeg7.rotation.z += 0.2;
	palmTree.add(palmTrunkSeg7);

	var palmTrunkSeg8 = palmTrunkSeg7.clone();
	palmTrunkSeg8.position.y += 6;
	palmTrunkSeg8.position.x -= 5.5;
	palmTrunkSeg8.rotation.z -= 0.2;
	palmTree.add(palmTrunkSeg8);

	var palmTrunkTop = palmTrunkSeg8.clone();
	palmTrunkTop.position.y += 10;
	palmTrunkTop.position.x -= 6;
	palmTrunkTop.rotation.z -= 0.2;
	palmTrunkTop.scale.set(1.3,1.6,1.3);
	palmTree.add(palmTrunkTop);


	var palmLeaves = new THREE.Group();
	palmLeaves.position.set(-34,76,0);
	palmLeaves.rotation.z = Math.PI/10;

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

	palmLeaf.castShadow = true;
	palmLeaf.receiveShadow = true;	
	//palmLeaves.add(palmLeaf);


	for(var i=0; i<6; i++){

		var l = new THREE.Mesh( geomPalmLeaf, matGreen );
		l.rotation.y = i*Math.PI/3;
		var s = .7 + Math.random()*.95;
		l.scale.set(1,s,1);
		l.castShadow = true;
		l.receiveShadow = true;	
		palmLeaves.add(l);
	}

	for(var i=0; i<6; i++){

		var l = new THREE.Mesh( geomPalmLeaf, matGreen );
		l.rotation.y = i*Math.PI/3 + Math.PI/6;
		l.position.y = -3;
		var s = .5 + Math.random()*.8;
		l.scale.set(.8,s,.7);
		l.castShadow = true;
		l.receiveShadow = true;	
		palmLeaves.add(l);
	}

	palmTree.add(palmLeaves);	

	island.add(palmTree);


	this.mesh.add(island);
}


function SeaGull(){
	this.mesh = new THREE.Object3D();
	var gull = new THREE.Group();


	var matGrey = new THREE.MeshPhongMaterial({color:Colors.grey, shading:THREE.FlatShading, wireframe:false});
	var matWhite = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading, wireframe:false});
	var matOrange = new THREE.MeshPhongMaterial({color:Colors.orange, shading:THREE.FlatShading, wireframe:false});

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

SeaGull.prototype.flapWings = function (){

	var flapRate = 0.0075;

	// var seconds = clock.getDelta(); // seconds.
	// var turningCircle = Math.PI / 4 * seconds;
	// var speed = 50 * seconds;

	//Flap Animation
	seaGull.wingRightInner.rotation.z = Math.sin(Date.now() * flapRate) * Math.PI * 0.1 ;	
	seaGull.wingLeftInner.rotation.z = Math.sin(Date.now() * flapRate) * -Math.PI * 0.1 ;	
	seaGull.wingRightOuter.rotation.z = Math.sin(Date.now() * flapRate) * Math.PI * 0.2 ;	
	seaGull.wingLeftOuter.rotation.z = Math.sin(Date.now() * flapRate) * -Math.PI * 0.2 ;
	seaGull.tail.rotation.x = Math.sin(Date.now() * 0.001) * -Math.PI * 0.05 ;
	seaGull.head.rotation.y = Math.sin(Date.now() * 0.001) * Math.PI * 0.075 ;
	seaGull.mesh.translateY (Math.sin(Date.now() * flapRate) * -.07)  ;	

	//Circle Movement
	// seaGull.mesh.translateZ(-speed) ;
	// seaGull.mesh.rotateOnAxis( new THREE.Vector3(0,1,0), turningCircle);

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
var seaBed;
var boat;
var beacon;
var scatteredBeacons;
var desertIsland;
var seaGull;


function createSea(){ 
	sea = new Sea(1.7, 100, 100, 0.8, 0, 0);
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
function createSeaBed(){ 
	seaBed = new SeaBed();
	seaBed.mesh.position.y = -7.5;
	seaBed.mesh.castShadow = false;
	seaBed.mesh.receiveShadow = false;
	scene.add(seaBed.mesh);
}

function createIsland(x,y,z){ 
	desertIsland = new DesertIsland();
	desertIsland.mesh.position.z = z;
	desertIsland.mesh.position.x = x;
	desertIsland.mesh.rotation.y = y;
	scene.add(desertIsland.mesh);
}

function createSeaGull(x,y,z){ 
	seaGull = new SeaGull();
	seaGull.mesh.scale.set(.4,.4,.4);
	seaGull.mesh.position.set(x, y, z);
	scene.add(seaGull.mesh);

}

function createBoat(){ 
	boat = new Boat();
	boat.mesh.position.set(0,0,10);
	boat.mesh.scale.set(1,1,1);
	scene.add(boat.mesh);
}
function createBeacon(){ 
	beacon = new Beacon(Colors.red,Colors.white);
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
	createSeaBed();

	createIsland(-80,0,-250);
	createIsland(120,2,250);
	createIsland(-400,-2,250);

	createSeaGull(50, 50, 100);

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
	seaGull.flapWings();

	requestAnimationFrame(loop);
	update();
}

function update (){

	var delta = clock.getDelta(); // seconds.

	//Boat Movement
	var rotateAngle = Math.PI / 3.5 * delta; 
	var propellorAngle = Math.PI * 4 * delta;   // degrees per second
	var moveDistance = 100 * delta; // 100 pixels per second

	//Sea Gull Movement
	var turningCircle = Math.PI /10 * delta;
	var speed = 50 * delta;

	seaGull.mesh.translateZ(-speed) ;
	seaGull.mesh.rotateOnAxis( new THREE.Vector3(0,1,0), turningCircle);


	console.log(boat.mesh.position);
	//Engine Idle
	boat.propellor.rotateOnAxis( new THREE.Vector3(0,1,0), propellorAngle/8);

	//Engine Rotation
	var engineY = boat.engineBlock.rotation.y;
	var maxEngineY = .8;

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

