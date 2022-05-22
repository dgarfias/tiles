// Mapa predeterminado
map = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
       [0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
       [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1],
       [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1],
       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1],
       [1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1],
       [1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1],
       [1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1],
       [0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
       [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
       [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
       [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
       [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
       [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1]];

// Encontrar ruta
findWay = false;
findWayMap = [];


// Robots
robots = [];
activeRobot = 0;

// Opciones MQTT
const MQTT_options = {
  clean: true,
  connectionTimeout: 4000,
  clientId: 'web',
  username: 'david',
  password: 'brightside99',
};

// Obtener canvas
canvas = document.getElementById('tileMap');
drawing = document.getElementById('drawing');
context = canvas.getContext('2d');
context.canvas.width = canvas.clientWidth;
context.canvas.height = canvas.clientHeight;

// Obtener columnas y filas
tileColumns = map[0].length;
tileRows = map.length;
tileWidth = context.canvas.width / tileColumns;
tileHeight = context.canvas.height / tileRows;

// Para hover de tiles
mouseInside = 0;
mousePos = {'x': 0, 'y': 0 };

// Dropdown de robots
robotSel = document.getElementById("robotSel");

function drawMap() {
  // Dibujar los tiles
  context.strokeStyle = "#000000";
  context.lineWidth = 1;
  for(var i = 0; i < tileRows; i++) {
    for(var j = 0; j < tileColumns; j++) {
      if(map[i][j] == 1) {
          context.fillStyle = "#e6eaea";
          
      } else {
        context.fillStyle = "white";
        if(findWay) {
          if(findWayMap[i][j] == 1) {
            context.fillStyle = "#64cef3";
          }
        }
        context.strokeRect(tileWidth*j, tileHeight*i, tileWidth, tileHeight);
      }
      context.fillRect(tileWidth*j, tileHeight*i, tileWidth, tileHeight);    
    }
  }

  // Tile hover
  if((mouseInside == 1) && (map[mousePos.y][mousePos.x] != 1)) {
    context.lineWidth = 2.5;
    context.strokeRect(tileWidth*mousePos.x, tileHeight*mousePos.y, tileWidth, tileHeight);
  }

  // Dibujar robots
  robots.forEach((e, index) => {

    // Dibujar círculo en el mapa identificando a robot
    context.fillStyle = (index == activeRobot) ? "#4df95c" : "#a5abfc";
    context.strokeStyle = (index == activeRobot) ? "#0c6815" : "#1d32c6";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(tileWidth*e.pos.x + tileWidth/2, tileHeight*e.pos.y + tileHeight/2, 10, 0, 6.2832, false);
    context.stroke();
    context.fill();
    context.closePath();

    // Identificador del robot en texto
    context.font = "15px Arial";
    context.fillStyle = (index == activeRobot) ? "#0c6815" : "#1d32c6";
    context.fillText(index, tileWidth*e.pos.x + tileWidth/2 - 5, tileHeight*e.pos.y + tileHeight/2 + 5);
  });


  context.drawImage(canvas, 0, 0);
}

// Detectar la posición del mouse adentro
drawing.addEventListener('mousemove', function(e) {
  mouseInside = 1;
  canvasOffsetTop = canvas.offsetTop + canvas.offsetParent.offsetTop + 
    canvas.offsetParent.offsetParent.offsetTop;
  canvasOffsetLeft = canvas.offsetLeft + canvas.offsetParent.offsetLeft + 
    canvas.offsetParent.offsetParent.offsetLeft;
  mousePos.x = Math.floor((e.clientX - canvasOffsetLeft)/tileWidth);
  mousePos.y = Math.floor((e.clientY - canvasOffsetTop)/tileHeight);
});

function findWayAlgo(position, end, matrix) {
  var queue = [];

  matrix[position[0]][position[1]] = 1;
  queue.push([position]); // store a path, not just a position

  while (queue.length > 0) {
    var path = queue.shift(); // get the path out of the queue
    var pos = path[path.length-1]; // ... and then the last position from it
    var direction = [
      [pos[0] + 1, pos[1]],
      [pos[0], pos[1] + 1],
      [pos[0] - 1, pos[1]],
      [pos[0], pos[1] - 1],
    ];

    for (var i = 0; i < direction.length; i++) {
      // Perform this check first
      if(typeof matrix[direction[i][0]] === 'undefined') {
        continue;
      }
      if (direction[i][0] < 0 || direction[i][0] >= matrix[0].length 
        || direction[i][1] < 0 || direction[i][1] >= matrix[0].length 
        || matrix[direction[i][0]][direction[i][1]] != 0) { 
      continue;
    }
      if (direction[i][0] == end[0] && direction[i][1] == end[1]) {
        // return the path that led to the find
        return path.concat([end]); 
      }

      matrix[direction[i][0]][direction[i][1]] = 1;
      // extend and push the path on the queue
      queue.push(path.concat([direction[i]])); 
    }
  }
}


// Detectar clicks (ruta más corta)
drawing.addEventListener('click', function(event) {
  if(findWay) {
    findWay = false;
  } else {
    let matrix = map.map(inner => inner.slice());
    findWayMap = Array(tileRows).fill().map(() => Array(tileColumns).fill(0));
    findWayAlgo([robots[activeRobot].pos.y, robots[activeRobot].pos.x], [mousePos.y, mousePos.x], matrix).forEach(e => {
      findWayMap[e[0]][e[1]] = 1;
    });
    findWay = true;
  }
});

// el mouse está afuera
canvas.addEventListener('mouseout', function(event) {
  mouseInside = 0;
});

// Añadir nuevo robot cuando se conecte 
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

// Para detectar cambios del robots seleccionado
robotSel.addEventListener('change', function() {
  activeRobot = this.value;
});


// Imprimir datos de sensores
function getSensors() {
  if(robotSel.disabled == false) {
    e = robots[activeRobot];
    
    document.getElementById("robotData").innerHTML = "Posición: " + e.pos.x + ", " + e.pos.y;

    if(e.hasOwnProperty("temp")) {
      document.getElementById("robotData").innerHTML += "<br />Temperatura: " + e.temp + "° C";
    }

    if(e.hasOwnProperty("pres")) {
      document.getElementById("robotData").innerHTML += "<br />Presión: " + e.pres + " hPA";
    }

    if(e.hasOwnProperty("hum")) {
      document.getElementById("robotData").innerHTML += "<br />Humedad: " + e.hum + "%";
    }
  }
}

// MQTT Conexión
const client = mqtt.connect("mqtt://192.168.100.20:1800", MQTT_options);

client.on('connect', function() {
  console.log('Connected to MQTT');
  client.subscribe('/announce');
});

// Manejo de mensajes
client.on('message', function(topic, message) {
  console.log("Received message from " + topic + ": " + message);
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
        Object.keys(decodedMessage).forEach(key => {
          robots[index][key] = decodedMessage[key];
        });
      }
    });
  }
});

setInterval(drawMap, 33);
setInterval(getSensors, 500);


