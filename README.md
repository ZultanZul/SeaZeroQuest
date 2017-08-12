# SeaZeroQuest
An Experiement in Three JS and documenting my learning of Javascript and WebGL. 

## [Level-1](https://zultanzul.github.io/SeaZeroQuest/Level1) - Scene creation
The first stage was to take my exisiting Three.js knowledge and implement a complex scene.

![Level 1 Screenshot](/resource/screens/level1.png?raw=true "Level 1 Screenshot")

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


## Level-2 - Optimise all the things
The next step will be a refactoring of my existing code and funcions to reduce drawCalls. All static geometry will be merged into it's parent mesh.
