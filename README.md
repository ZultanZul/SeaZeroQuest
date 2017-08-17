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
Currently the water mesh is using 60% of the scenes drawCalls and performance. 

**Level 2 can be played [here](https://zultanzul.github.io/SeaZeroQuest/Level2)**