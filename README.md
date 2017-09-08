# SeaZeroQuest
An Experiement in Three JS and documenting my learning of Javascript and WebGL. 

## [Level-1](https://zultanzul.github.io/SeaZeroQuest/Level1) - Scene creation
The first stage was to take my exisiting Three.js knowledge and implement a complex scene.

![Level 1 Screenshot](https://zultanzul.github.io/SeaZeroQuest/resource/screens/level1.png?raw=true "Level 1 Screenshot")

Elements include:
- Boat model
- Sea shader and animation *"fake shader" using planes*
- Beacon model
- Island model
- Sea Gull model and animation
- User Controls with no persistence

**Controls** - 
Mouse/Touch to rotate the camera.
WASD to move the boat.

**Level 1 can be played [here](https://zultanzul.github.io/SeaZeroQuest/Level1)**


## [Level-2](https://zultanzul.github.io/SeaZeroQuest/Level2) - Optimise all the things
The next step is a refactoring of my existing code and functions to reduce drawCalls.

![Level 2 Screenshot](https://zultanzul.github.io/SeaZeroQuest/resource/screens/level2.png?raw=true "Level 2 Screenshot")

Previous: 450+ draws, 2600 calls

Current: 92 draws, 900 calls

**Optimisation includes:**
 - GLSL WebGL Shader used for water - **reducing 700+ calls**
 - Merging Island Geometry and objects - **reducing 50 drawCalls and 200 calls**
 - Merging Beacon Geometry - **reducing 5 drawCalls and 35 calls**
 - Merging Boat Geometry - **reducing 100 drawCalls** - *further opti for calls req.*
 - SeaGulls - Due to the nature of animating all the elements, merging isn't possible. ReUsed geometry and animation for all with offsets for variation. - *further opti for calls req.*

**Controls** - 
Mouse/Touch to rotate the camera.
WASD to move the boat.

**Level 2 can be played [here](https://zultanzul.github.io/SeaZeroQuest/Level2)**


## [Level-3](https://zultanzul.github.io/SeaZeroQuest/Level3) - Physics with Cannon.js
To add collision detection and make the controls feel better, I decided to add a physics engine to the scene.

Cannon.js is a physics engine written in and for Javascript and runs well with Three.js. It requires running a seperate physics "world" along side the three.js world.

**Controls** - 
Mouse/Touch to rotate the camera.
WASD to move the boat.

**Level 3 can be played [here](https://zultanzul.github.io/SeaZeroQuest/Level3)**