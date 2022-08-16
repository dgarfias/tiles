// Opciones MQTT
const MQTT_options = {
  clean: true,
  connectionTimeout: 4000,
  clientId: 'web',
  username: 'david',
  password: 'brightside99', 
};

const MQTT_server = "mqtt://127.0.0.1:1800" // 'mqtt://ip:puerto'

// Equivalencia en metros
tiletometer = 1/5;

// Leer secciones de los mapas
mapWidth = 0
mapHeight = 0
const roomMaps = [
  "maps/hab1.json", "maps/hab2.json", "maps/hab3.json",
  "maps/hab4.json", "maps/hab5.json", "maps/hab6.json",
  "maps/alm.json", "maps/enf.json", "maps/pas.json"]
var rooms = []

// Leer los archivos
const request = new XMLHttpRequest()
roomMaps.forEach(e => {
  request.open('GET', e, false)
  request.send(null)
  rooms.push(JSON.parse(request.responseText))
})

// Obtener ancho y largo del mapa
rooms.forEach(e => {
  if((e.pos.x + e.size.width) > mapWidth)
    mapWidth = e.pos.x + e.size.width
  if((e.pos.y + e.size.height) > mapHeight)
    mapHeight = e.pos.y + e.size.height
})

// Obtener canvas
canvas = document.getElementById('tileMap')
context = canvas.getContext('2d')
context.canvas.width = canvas.clientWidth
context.canvas.height = canvas.clientHeight

// Obtener columnas y filas
tileWidth = context.canvas.width / mapWidth
tileHeight = context.canvas.height / mapHeight

// Y de cuarto individual
roomCanvas = document.getElementById("tileRoom")
roomContext = roomCanvas.getContext('2d')
roomTileWidth = roomContext.canvas.width / 20
roomTileHeight = roomContext.canvas.height / 20 

// Modo actual
currentMode = 0 // 0 para general, 1 para individual
currentRoom = "hab1"; // cuarto actual (cuando no se esté en general)

// Cargar tipos de objetos
request.open('GET', "objs.json", false)
request.send(null)
const objTypes = JSON.parse(request.responseText)
var drawnBackground = false

// Obtención del mapa completo para algoritmo de ruta corta
sdMap = []
for(var i = 0; i < mapHeight; i++) {
  sdMap.push(Array(mapWidth))
}


rooms.forEach(e => {
  for(var i = 0; i < e.size.height; i++) {
    for(var j = 0; j < e.size.width; j++) {
      sdMap[i+e.pos.y][j + e.pos.x] = e.map[i][j]
    }
  }
  e.objs.forEach(obj => {
    objType = objTypes.find(x => x.name == obj.type)
    if(!objType.through) {
      for(var i = 0; i < objType.size.height; i++) {
        for(var j = 0; j < objType.size.width; j++) {
          sdMap[e.pos.y + obj.pos.y + i][e.pos.x + obj.pos.x + j] = 1
        }
      }
    }
  })
})

// Detectar la posición del mouse adentro
mouseInside = 0
mousePos = {'x': 0, 'y': 0 }

canvas.addEventListener('mousemove', function(e) {
  mouseInside = 1
  canvasOffsetTop = canvas.offsetTop + canvas.offsetParent.offsetTop + 
    canvas.offsetParent.offsetParent.offsetTop
  canvasOffsetLeft = canvas.offsetLeft + canvas.offsetParent.offsetLeft + 
    canvas.offsetParent.offsetParent.offsetLeft
  mousePos.x = Math.floor((e.clientX - canvasOffsetLeft)/tileWidth)
  mousePos.y = Math.floor((e.clientY - canvasOffsetTop)/tileHeight)
});

// el mouse está afuera
canvas.addEventListener('mouseout', function(event) {
  mouseInside = 0;
});

// Para los robots
robots = [];
activeRobot = 0;
robotColors = [["#fcb7af", "#ffe4e1"], ["#b0f2c2", "#d8f8e1"], 
  ["#74a7e4", "#dceafc"], ["#cbcd69", "#fffee1"], ["#cd9cb2", "#fff0f6"],
  ["#867464", "#f2ece7"], ["#a41090", "#ffbbff"]];

function isThereRobot(x, y) {
  for(var i = 0; i < robots.length; i++) {
    if(robots[i].pos.x == x && robots[i].pos.y == y) {
      return true;
    }
  }
  return false;
}

// Para sacar copias del dibujo base
var canvasCopy = document.createElement('canvas');
canvasCopy.width = canvas.width;
canvasCopy.height = canvas.height;
var canvasCopyCtx = canvasCopy.getContext('2d');

var roomCanvasCopy = document.createElement('canvas');
roomCanvasCopy.width = roomCanvas.width;
roomCanvasCopy.height = roomCanvas.height;
var roomCanvasCopyCtx = roomCanvasCopy.getContext('2d');

// Para el algoritmo de buscar ruta
findWay = false;
findWayQueue = [];
findWayDrawn = false;

function findWayAlgo(source, end, map) {
  // Arreglo de lugares ya visitados
  var visited = [];
  for(var i = 0; i < map.length; i++) {
    visited.push(Array(map[0].length).fill(false));
  }

  visited[source.y][source.x] = true;

  var queue = [];
  queue.push({"x": source.x, "y": source.y});
  var resQueue = [];

  while(queue.length > 0) {
    var curr = queue.shift();

    if(curr.x == end.x && curr.y == end.y) {
      // Ir hacia atrás para la ruta
      while(curr.x != source.x || curr.y != source.y) {
        resQueue.push({"x": curr.x, "y": curr.y});
        curr = curr.p;
      }
      return resQueue;
    }
    
    // y - 1, x
    if(curr.y > 0) {
      if(!isThereRobot(curr.x, curr.y - 1)) { 
        if(!visited[curr.y - 1][curr.x] && map[curr.y - 1][curr.x] == 0) {
          visited[curr.y - 1][curr.x] = true;
          queue.push({"x": curr.x, "y": curr.y - 1, "p": curr})
        } 
      }
    }

    // y + 1, x
    if(curr.y < map.length - 1) {
      if(!isThereRobot(curr.x, curr.y + 1)) { 
        if(!visited[curr.y + 1][curr.x] && map[curr.y + 1][curr.x] == 0) {
          visited[curr.y + 1][curr.x] = true;
          queue.push({"x": curr.x, "y": curr.y + 1, "p": curr})
        } 
      }
    }

    // y, x - 1
    if(curr.x > 0) {
      if(!isThereRobot(curr.x - 1, curr.y)) { 
        if(!visited[curr.y][curr.x - 1] && map[curr.y][curr.x - 1] == 0) {
          visited[curr.y][curr.x - 1] = true;
          queue.push({"x": curr.x - 1, "y": curr.y, "p": curr})
        }
      }
    }

    // y, x + 1
    if(curr.x < map[0].length - 1) {
      if(!isThereRobot(curr.x + 1, curr.y)) { 
        if(!visited[curr.y][curr.x + 1] && map[curr.y][curr.x + 1] == 0) {
          visited[curr.y][curr.x + 1] = true;
          queue.push({"x": curr.x + 1, "y": curr.y, "p": curr})
        }
      }
    }
  }
  return -1;

}

// Cuando se dé click, algoritmo de ruta más corta
canvas.addEventListener('click', function(event) {
  if(findWay) {
    findWay = false;
    findWayDrawn = false;
    context.drawImage(canvasCopy, 0, 0)
  } else {
    findWayQueue = findWayAlgo(robots[activeRobot].pos, {"x": mousePos.x, "y": mousePos.y}, sdMap);
    findWay = true;
  }
});

// Para cambio de habitación
drawnRoomBackground = false;
buttons = document.getElementsByClassName("roomButton");
for(let roomButton of buttons) {
  roomButton.addEventListener('click', function() {
    if(roomButton.id == "gen") {
      if(currentMode == 1) {
        currentMode = 0;
        document.getElementsByClassName("leftRoomContainer")[0].style.display = "none";
        document.getElementsByClassName("leftMapContainer")[0].style.display = "block";
      }
    } else {
      if(currentRoom != roomButton.id) {
        currentRoom = roomButton.id;      
        drawnRoomBackground = false;
        roomContext.clearRect(0, 0, roomCanvas.width, roomCanvas.height)
        roomCanvasCopyCtx.clearRect(0, 0, roomCanvas.width, roomCanvas.height)
      }

      if(currentMode == 0) {
        currentMode = 1;
        document.getElementsByClassName("leftRoomContainer")[0].style.display = "block";
        document.getElementsByClassName("leftMapContainer")[0].style.display = "none";
      }
    } 
  })
}

// Dibujar el mapa
lastPos = {"x": 0, "y": 0};
loadedImgs = 0
imgsToLoad = 0
function drawMap() {
  if(currentMode == 0) {
    // Modo general
    // Dibujar los fondos si no se ha hecho
    roomHover = "";
    if(drawnBackground == false) {
      context.strokeStyle = "#000000"
      context.lineWidth = 1
      rooms.forEach(e => {
        // Dibujo del cuarto
        context.fillStyle = e.style.backColor
        context.strokeRect(tileWidth*e.pos.x, tileHeight*e.pos.y,tileWidth*e.size.width, tileHeight*e.size.height)
        context.fillRect(tileWidth*e.pos.x, tileHeight*e.pos.y,tileWidth*e.size.width, tileHeight*e.size.height)

        // Título de la habitación
        context.font = "12pt Sans Serif"
        context.textAlign =  "center"
        context.fillStyle = "black"
        context.fillText(e.name, tileWidth*e.pos.x + tileWidth*e.size.width/2, tileWidth*e.pos.y + tileWidth*e.size.height/2)

        // Dibujar los objetos que se pueden ver en vista general
        e.objs.forEach(obj => {
          objType = objTypes.find(x => x.name == obj.type)
          if(objType.general) {
            var img = new Image()
            img.src = objType.image
            img.pos = {"x": 0, "y": 0}
            img.pos.x = obj.pos.x + e.pos.x
            img.pos.y = obj.pos.y + e.pos.y
            img.size = objType.size
            img.onload = function() {
              context.drawImage(this, tileWidth*this.pos.x, tileHeight* this.pos.y, 
              tileWidth*this.size.width, tileHeight*this.size.height)
              canvasCopyCtx.drawImage(canvas, 0, 0)
            }
          }
        })
        drawnBackground = true
      })
      
    }

    // Detectar mouse para ruta más corta
    if(mouseInside && !findWayDrawn) {
      if(lastPos.x != mousePos.x || lastPos.y != mousePos.y) {
        if(sdMap[mousePos.y][mousePos.x] == 0) {
          context.drawImage(canvasCopy, 0, 0)
          context.globalAlpha = 0.4;
          context.fillRect(tileWidth*mousePos.x, tileHeight*mousePos.y, tileWidth, tileHeight);    
          context.globalAlpha = 1;
          lastPos.x = mousePos.x;
          lastPos.y = mousePos.y;
        }
      }
    } else {
      lastPos = {};
      context.drawImage(canvasCopy, 0, 0)
    }

    // Si hay algoritmo de ruta más corta
    if(findWay) {
      findWayQueue.forEach(e => {
        context.globalAlpha = 0.4;
        context.fillRect(tileWidth*e.x, tileHeight*e.y, tileWidth, tileHeight);    
        context.globalAlpha = 1;
      });
      findWayDrawn = true;
    }
    
    // Dibujar los robots
    for(var i = 0; i < robots.length; i++) {
      // Dibujar círculo en el mapa identificando a robot
      context.fillStyle = robotColors[i][1];
      context.strokeStyle = robotColors[i][0];
      context.lineWidth = 2;
      context.beginPath();
      context.arc(tileWidth*robots[i].pos.x + tileWidth/2, tileHeight*robots[i].pos.y + tileHeight/2, 12, 0, 6.2832, false);
      context.stroke();
      context.fill();
      context.closePath();
      context.strokeStyle = "#000000";

      // Identificador del robot en texto
      context.font = "14px Arial Black";
      context.fillStyle = "#000000";
      context.fillText(robots[i].id, tileWidth*robots[i].pos.x + tileWidth/2, tileHeight*robots[i].pos.y + tileHeight/2 + 4);
    }

    
  } else {
    // Dibujar los tiles
    roomObj = rooms.find(e => {return e.id == currentRoom});


    if(!drawnRoomBackground) {
      if(roomContext.canvas.width == 0) {
        roomContext.canvas.width = roomCanvas.clientWidth
        roomContext.canvas.height = roomCanvas.clientHeight
      }
      roomContext.clearRect(0, 0, roomCanvas.width, roomCanvas.height);
      loadedImgs = 0
      imgsToLoad = 0

      roomContext.lineWidth = 1;
      roomContext.fillStyle = "white";
      for(var i = 0; i < roomObj.size.height; i++) {
        for(var j = 0; j < roomObj.size.width; j++) {
          if(sdMap[i + roomObj.pos.y][j + roomObj.pos.x] == 1) {
            roomContext.strokeStyle = "white";
              
          } else {
            roomContext.strokeStyle = "#787878";
            roomContext.strokeRect(roomTileWidth*j, roomTileHeight*i, roomTileWidth, roomTileHeight);
          }
          roomContext.fillRect(roomTileWidth*j, roomTileHeight*i, roomTileWidth, roomTileHeight);    
        }
      }

      // Dibujar los objetos que se pueden ver en vista general

      roomObj.objs.forEach(obj => {
        imgsToLoad = imgsToLoad + 1
        objType = objTypes.find(x => x.name == obj.type)
        var img = new Image()
        img.src = objType.image
        img.pos = obj.pos
        img.size = objType.size
        img.onload = function() {
          roomContext.drawImage(this, roomTileWidth* this.pos.x, roomTileHeight* this.pos.y, 
          roomTileWidth*this.size.width, roomTileHeight*this.size.height)
          roomCanvasCopyCtx.drawImage(roomCanvas, 0, 0)
          loadedImgs = loadedImgs + 1
        }
      })
      drawnRoomBackground = true;
    }

    roomContext.drawImage(roomCanvasCopy, 0, 0)
    i = 0

    if(loadedImgs == imgsToLoad) {
      robots.forEach(rb => {
        if(rb.pos.x >= roomObj.pos.x && rb.pos.x < (roomObj.pos.x + roomObj.size.width)) {
          if(rb.pos.y >= roomObj.pos.y && rb.pos.y < (roomObj.pos.y + roomObj.size.height)) {

            roomContext.fillStyle = robotColors[i][1];
            roomContext.strokeStyle = robotColors[i][0];
            roomContext.lineWidth = 2;
            roomContext.beginPath();
            roomContext.arc(roomTileWidth*(rb.pos.x - roomObj.pos.x) + roomTileWidth/2, roomTileHeight*(rb.pos.y - roomObj.pos.y) + roomTileHeight/2, 25, 0, 6.2832, false);
            roomContext.stroke();
            roomContext.fill();
            roomContext.closePath();
            roomContext.strokeStyle = "#000000";
      
            // Identificador del robot en texto
            roomContext.font = "20px Arial Black";
            roomContext.fillStyle = "#000000";
            roomContext.fillText(rb.id, roomTileWidth*( rb.pos.x - roomObj.pos.x)+ roomTileWidth/2, roomTileHeight*(rb.pos.y - roomObj.pos.y) + roomTileHeight/2 + 4);
            i++;
          }
        }
      })
    }
  }
}


// Añadir nuevo robot cuando se conecte 
robotInd = 0;
function addRobot(robot) {
  // Añadir al arreglo
  robots.push(robot);
  robotInd = robots.length - 1;

  if(robotSel.disabled) {
    robotSel.innerHTML = "";
    robotSel.disabled = false;
  }

  opt = document.createElement("option");
  opt.value = robotInd;
  opt.innerHTML = robotInd + ": " + robot.name;
  robotSel.appendChild(opt);
}

robotSel.addEventListener('change', function() {
  activeRobot = this.value;
});

// MQTT Conexión
const client = mqtt.connect(MQTT_server, MQTT_options);

client.on('connect', function() {
  console.log('Conectado a MQTT');
  client.subscribe('/announce');
});

// Manejo de mensajes
client.on('message', function(topic, message) {
  console.log("Mensaje recibido de" + topic + ": " + message);
  if(topic == '/announce') {
    // Tenemos nuevo robot
    addRobot(JSON.parse(message));

    client.subscribe('/robot/' + robots[robots.length - 1].id);
  } else if(topic.startsWith('/robot/')) {
    // Si el mensaje fue enviado por un robot
    robotId = topic.replace('/robot/', '');
    robots.forEach((e, index) => {
      if(e.id == robotId) {
        decodedMessage = JSON.parse(message);
        decodedMessage["pos"] = {"x": parseInt((decodedMessage.posmet.x/tiletometer).toFixed(0)), "y": parseInt((decodedMessage.posmet.y/tiletometer).toFixed(0)) };
        Object.keys(decodedMessage).forEach(key => {
          robots[index][key] = decodedMessage[key];
        });
      }
    });
  }
});

// Imprimir datos de sensores
function getSensors() {
  if(robotSel.disabled == false) {
    e = robots[activeRobot];
    
    if(e.hasOwnProperty("posmet") && e.hasOwnProperty("pos")) {
      document.getElementById("robotData").innerHTML = "Posición: " + e.posmet.x.toFixed(2) 
        + " m, " + e.posmet.y.toFixed(2) + "m. (" + e.pos.x + ", " + e.pos.y + ")";
    }

    if(e.hasOwnProperty("temp")) {
      document.getElementById("robotData").innerHTML += "<br />Temperatura: " + e.temp.toFixed(2) + "° C";
    }

    if(e.hasOwnProperty("pres")) {
      document.getElementById("robotData").innerHTML += "<br />Presión: " + e.pres.toFixed(2) + " hPA";
    }

    if(e.hasOwnProperty("hum")) {
      document.getElementById("robotData").innerHTML += "<br />Humedad: " + e.hum.toFixed(2) + "%";
    }
  }
}

setInterval(drawMap, 33)
setInterval(getSensors, 100)
