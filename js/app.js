var canvas = document.getElementById("main-canvas");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var g = canvas.getContext("2d");

var cols = 12;
var rows = 12;
var cellSize = Math.min(Math.ceil(canvas.width / cols), Math.ceil(canvas.height / rows));

function loadImage(path) {
    var img = new Image();
    img.src = path;
    return img;
}

// Load sprites
var neuroFront = loadImage('../img/neuro_front.png');
var neuroLeft = loadImage('../img/neuro_left.png');
var neuroRight = loadImage('../img/neuro_right.png');
var neuroBack = loadImage('../img/neuro_back.png');
var candle = loadImage('../img/candle.png');
var groundOverlay = loadImage('../img/ground_overlay.png');
var wall = loadImage('../img/wall.png');

var grid = [];
var path = [];
var player;
var lights = [];
var lightmap = Array(rows).fill().map(() => Array(cols).fill(0));
var gameState = "opening"; // Track the game state

function setup() {
    var unvisited = [];
    for (var r = 0; r < rows; r++) {
        grid.push([]);
        for (var c = 0; c < cols; c++) {
            var cell = new Cell(r, c);
            grid[r].push(cell);
            unvisited.push(cell);
        }
    }

    // Start with a random cell
    var start = unvisited.splice(Math.floor(Math.random() * unvisited.length), 1)[0];
    start.visited = true;

    while (unvisited.length > 0) {
        var current = unvisited[Math.floor(Math.random() * unvisited.length)];
        path = [current];

        while (!current.visited) {
            var next = current.randomNeighbor();
            if (path.includes(next)) {
                path = path.slice(0, path.indexOf(next) + 1);
            } else {
                path.push(next);
            }
            current = next;
        }

        for (var i = 0; i < path.length - 1; i++) {
            removeWalls(path[i], path[i + 1]);
            path[i].visited = true;
            unvisited.splice(unvisited.indexOf(path[i]), 1);
        }
    }

    // Initialize player at the top-left corner
    player = new Player(0, 0);

    // Register controls.
    window.addEventListener("keydown", function (e) {
        if (e.key === "ArrowUp") {
            player.move("up");
        } else if (e.key === "ArrowRight") {
            player.move("right");
        } else if (e.key === "ArrowDown") {
            player.move("down");
        } else if (e.key === "ArrowLeft") {
            player.move("left");
        } else if (e.key === " ") {
            player.dropObject();
        }
    });
}

function renderLight(x, y, radius) {
    g.save()
    g.globalCompositeOperation = "lighter"
    var rnd = 0.05 * Math.sin((10 * Date.now()) / 1000)
    radius = radius * (1 + rnd)
    var radialGradient = g.createRadialGradient(x, y, 0, x, y, radius)
    radialGradient.addColorStop(0.0, "#BB9")
    radialGradient.addColorStop(0.2 + rnd, "#AA8")
    radialGradient.addColorStop(0.7 + rnd, "#330")
    radialGradient.addColorStop(0.9, "#110")
    radialGradient.addColorStop(1, "#000")
    g.fillStyle = radialGradient
    g.fillRect(0, 0, canvas.width, canvas.height)
    g.restore()
}

function Light(r, c) {
    this.r = r;
    this.c = c;
    this.brightness = 3;

    this.drawLight = function () {
        var x = this.c * cellSize;
        var y = this.r * cellSize;
        var radius = this.brightness * cellSize; // Radius of 5 grid cells

        renderLight(x + cellSize / 2, y + cellSize / 2, radius);

    };

    this.drawCandle = function () {
        var x = this.c * cellSize;
        var y = this.r * cellSize;
        g.drawImage(candle, x, y, cellSize, cellSize);
    };
}

function Player(r, c) {
    this.r = r;
    this.c = c;
    this.visualR = r;
    this.visualC = c;
    this.currentSprite = neuroFront;
    this.lights = 3;

    this.move = function (dir) {
        if (dir === "up" && this.r > 0 && !grid[this.r][this.c].wallUp) {
            this.r--;
            this.currentSprite = neuroBack;
        } else if (dir === "right" && this.c < cols - 1 && !grid[this.r][this.c].wallRight) {
            this.c++;
            this.currentSprite = neuroRight;
        } else if (dir === "down" && this.r >= 0 && !grid[this.r][this.c].wallDown) {
            this.r++;
            this.currentSprite = neuroFront;
        } else if (dir === "left" && this.c > 0 && !grid[this.r][this.c].wallLeft) {
            this.c--;
            this.currentSprite = neuroLeft;
        }
    };

    this.showLight = function () {
        var x = this.visualC * cellSize;
        var y = this.visualR * cellSize;
        renderLight(x + cellSize / 2, y + cellSize / 2, 3 * cellSize / 2);
    }

    this.show = function () {
        var x = this.visualC * cellSize;
        var y = this.visualR * cellSize;

        g.drawImage(this.currentSprite, x, y, cellSize, cellSize);
        this.visualR += (this.r - this.visualR) * 0.1;
        this.visualC += (this.c - this.visualC) * 0.1;

        // Display the number of highlight objects remaining
        g.fillStyle = "white";
        g.font = "16px Arial";
        g.fillText("Candles remaining: " + this.lights, 200, canvas.height - 20);
    };

    this.dropObject = function () {
        if (this.lights > 0) {
            addLight(new Light(this.r, this.c));
            this.lights--;
        }
    };
}

function Cell(r, c) {
    this.r = r;
    this.c = c;

    this.wallUp = true;
    this.wallDown = true;
    this.wallLeft = true;
    this.wallRight = true;

    this.visited = false;

    this.randomNeighbor = function () {
        var neighbors = [];

        if (this.r > 0) neighbors.push(grid[this.r - 1][this.c]);
        if (this.r < rows - 1) neighbors.push(grid[this.r + 1][this.c]);
        if (this.c > 0) neighbors.push(grid[this.r][this.c - 1]);
        if (this.c < cols - 1) neighbors.push(grid[this.r][this.c + 1]);

        if (neighbors.length > 0) {
            var r = Math.floor(Math.random() * neighbors.length);
            return neighbors[r];
        } else {
            return undefined;
        }
    };

    this.show = function () {
        var x = this.c * cellSize;
        var y = this.r * cellSize;

        var isNearPlayer = Math.abs(this.r - player.r) <= 1 && Math.abs(this.c - player.c) <= 1;
        var isLit = isNearPlayer || lightmap[this.r][this.c] >= 1;
        isLit = true;
        if (isLit) {
            g.save();
            g.globalCompositeOperation = "multiply";
            if (this.wallLeft) {
                g.drawImage(wall, x - cellSize / 2, y, cellSize*1.2, cellSize*1.2);
            }

            if (this.wallUp) {
                g.save();
                g.translate(x + cellSize / 2, y + cellSize / 2);
                g.rotate(Math.PI / 2);
                g.drawImage(wall, -cellSize, -cellSize + cellSize / 2 - 10, cellSize*1.2, cellSize*1.2);
                g.restore();
            }

            if (this.wallRight && this.c == cols - 1) {
                g.drawImage(wall, x + cellSize / 2, y, cellSize*1.2, cellSize*1.2);
            }

            if (this.wallUp) {
                g.save();
                g.translate(x + cellSize / 2, y + cellSize / 2);
                g.rotate(Math.PI / 2);
                g.drawImage(wall, -cellSize, -cellSize + cellSize / 2 - 10, cellSize*1.2, cellSize*1.2);
                g.restore();
            }
            g.restore();

            // g.strokeStyle = "yellow"; // Set the wall color to black
            // g.lineWidth = 8; // Increase the line width to make the walls thicker
            // if (this.wallUp) {
            //     g.beginPath();
            //     g.moveTo(x, y);
            //     g.lineTo(x + cellSize, y);
            //     g.stroke();
            // }
            // if (this.wallRight) {
            //     g.beginPath();
            //     g.moveTo(x + cellSize, y);
            //     g.lineTo(x + cellSize, y + cellSize);
            //     g.stroke();
            // }
            // if (this.wallDown) {
            //     g.beginPath();
            //     g.moveTo(x + cellSize, y + cellSize);
            //     g.lineTo(x, y + cellSize);
            //     g.stroke();
            // }
            // if (this.wallLeft) {
            //     g.beginPath();
            //     g.moveTo(x, y + cellSize);
            //     g.lineTo(x, y);
            //     g.stroke();
            // }
        } else {
            g.fillStyle = "black";
            g.fillRect(x, y, cellSize, cellSize);
        }
    };
}

function removeWalls(a, b) {
    var dx = b.c - a.c;
    if (dx === 1) { // right
        a.wallRight = false;
        b.wallLeft = false;
    } else if (dx === -1) { // left
        a.wallLeft = false;
        b.wallRight = false;
    }
    var dy = b.r - a.r;
    if (dy === 1) { // down
        a.wallDown = false;
        b.wallUp = false;
    } else if (dy === -1) { // up
        a.wallUp = false;
        b.wallDown = false;
    }
}

function addLight(light) {
    lights.push(light);
    updateLightmap(light);
}

function updateLightmap(light) {
    var visited = Array(rows).fill().map(() => Array(cols).fill(false));
    var queue = [{ r: light.r, c: light.c, brightness: light.brightness }];
    while (queue.length > 0) {
        var current = queue.shift();
        if (visited[current.r][current.c] || current.brightness <= 0) {
            continue;
        }
        visited[light.r][light.c] = true;
        lightmap[current.r][current.c] += current.brightness;
        if (current.brightness > 1) {
            if (current.r > 0 && !grid[current.r][current.c].wallUp) {
                queue.push({ r: current.r - 1, c: current.c, brightness: current.brightness - 1 });
            }
            if (current.r < rows - 1 && !grid[current.r][current.c].wallDown) {
                queue.push({ r: current.r + 1, c: current.c, brightness: current.brightness - 1 });
            }
            if (current.c > 0 && !grid[current.r][current.c].wallLeft) {
                queue.push({ r: current.r, c: current.c - 1, brightness: current.brightness - 1 });
            }
            if (current.c < cols - 1 && !grid[current.r][current.c].wallRight) {
                queue.push({ r: current.r, c: current.c + 1, brightness: current.brightness - 1 });
            }
        }
    }
}


function renderOpeningScreen() {
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "black";
    g.fillRect(0, 0, canvas.width, canvas.height);

    g.fillStyle = "white";
    g.font = "30px Arial";
    g.textAlign = "center";
    g.fillText("Welcome to Neuro Maze", canvas.width / 2, canvas.height / 2 - 40);
    g.font = "20px Arial";
    g.fillText("Press Enter to Start", canvas.width / 2, canvas.height / 2 + 20);
}

function startGame() {
    gameState = "playing";
    setup();
    // Start the game loop
    requestAnimationFrame(gameLoop);
}

function drawGame() {
    // Clear the canvas
    g.clearRect(0, 0, canvas.width, canvas.height);

    // Render all lights
    player.showLight();
    lights.forEach(light => light.drawLight());

    // Draw the start square (top-left corner)
    g.fillStyle = "green";
    g.fillRect(0, 0, cellSize, cellSize);
    g.fillStyle = "white";
    g.fillText("Start", 20, 20);


    // Draw the end square (bottom-right corner)
    let x = (cols - 1) * cellSize;
    let y = (rows - 1) * cellSize;
    g.fillStyle = "red";
    g.fillRect(x, y, cellSize, cellSize);
    g.fillStyle = "white";
    g.fillText("Exit", x + 20, y + 20);

    // Draw the grid
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            grid[r][c].show();
        }
    }

    // Draw the player, objects, and UI
    lights.forEach(light => light.drawCandle());
    player.show();
}

function updateSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cellSize = Math.min(Math.ceil(canvas.width / cols), Math.ceil(canvas.height / rows));
}

function gameLoop() {
    updateSize();
    if (gameState === "playing") {
        drawGame();
    } else if (gameState === "opening") {
        renderOpeningScreen();
    }
    requestAnimationFrame(gameLoop);
}

// Listen for key presses to start the game
window.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && gameState === "opening") {
        g.clearRect(0, 0, canvas.width, canvas.height);
        startGame();
    }
});

// Start the game loop
requestAnimationFrame(gameLoop);
