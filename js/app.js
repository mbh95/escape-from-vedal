var canvas = document.getElementById("main-canvas");

WIDTH = 1000;
HEIGHT = 1000;

canvas.width = WIDTH;
canvas.height = HEIGHT;

mazeWidth = canvas.width - 100;
mazeHeight = canvas.height - 100;

canvas_container = document.getElementById("canvas_img_box");

var g = canvas.getContext("2d");

var mazeCanvas = new OffscreenCanvas(canvas.width, canvas.height);
var mazeCtx = mazeCanvas.getContext("2d");

var cols = 16;
var rows = 16;
var cellSize = Math.min(Math.ceil(mazeWidth / cols), Math.ceil(mazeHeight / rows));

function loadImage(path) {
    var img = new Image();
    img.src = path;
    return img;
}

// Load sprites
var neuroFront = loadImage('./img/neuro_front.png');
var neuroLeft = loadImage('./img/neuro_left.png');
var neuroRight = loadImage('./img/neuro_right.png');
var neuroBack = loadImage('./img/neuro_back.png');
var evilFront = loadImage('./img/evil_front.png');
var evilLeft = loadImage('./img/evil_left.png');
var evilRight = loadImage('./img/evil_right.png');
var evilBack = loadImage('./img/evil_back.png');
var candle = loadImage('./img/candle.png');
var groundOverlay = loadImage('./img/ground_overlay.png');
var startSquare = loadImage('./img/start_square.png');
var endSquare = loadImage('./img/end_square.png');
var wall = loadImage('./img/wall.png');

var press_enter = loadImage("./img/press_enter.png");

var neuro_opening_1 = loadImage("./img/neuro_opening_1.png");
var neuro_opening_2 = loadImage("./img/neuro_opening_2.png");
var neuro_opening_3 = loadImage("./img/neuro_opening_3.png");
var neuro_opening_4 = loadImage("./img/neuro_opening_4.png");
var neuro_opening_5 = loadImage("./img/neuro_opening_5.png");

var evil_opening_1 = loadImage("./img/evil_opening_1.png");

var win_screen_1 = loadImage("./img/win_1.png");
var win_screen_2 = loadImage("./img/win_2.png");

var lose_1 = loadImage("./img/lose_1.png");

var bgm_ever_started = false;
var bgm = new Audio('./audio/bensound-prism.mp3');
bgm.loop = true;

// function playBgm() {
//     console.log("START BGM");
//     if (!click_initiated) {
//         return;
//     }
//     bgm.volume = 1.0;
//     bgm_ever_started = true;
// }

// function pauseBgm() {
//     console.log("STOP BGM");
//     bgm.pause
// }

var win_img = document.createElement("img");
win_img.style.display = "none";
win_img.className = "center";
win_img.src = "./img/win_2.png";
var src = document.getElementById("win_img_box");
src.appendChild(win_img);

var lose_img = document.createElement("img");
lose_img.style.display = "none";
lose_img.className = "center";
lose_img.src = "./img/lose_1.png";
var src = document.getElementById("lose_img_box");
src.appendChild(lose_img);

var grid = [];
var path = [];
var player;
var lights = [];
var lightmap = Array(rows).fill().map(() => Array(cols).fill(0));
var gameState = "opening_neuro"; // Track the game state

var timer_length_seconds = 15;
var timer_start_seconds = -1;

function show_win_image() {
    canvas.style.display = "none";
    win_img.style.display = "";
}

function hide_win_image() {
    canvas.style.display = "";
    g = canvas.getContext("2d");
    win_img.style.display = "none";
}

function show_lose_image() {
    canvas.style.display = "none";
    lose_img.style.display = "";
}

function hide_lose_image() {
    canvas.style.display = "";
    g = canvas.getContext("2d");
    lose_img.style.display = "none";
}

function vineboom() {
    var audio = new Audio('./audio/vine-boom.mp3');
    audio.play();
}

function playBgm() {
    document.getElementById("bgm").play();
}
function pauseBgm() {
    document.getElementById("bgm").pause();
}

function setup() {
    gameState = "playing_neuro";
    var unvisited = [];
    grid = [];
    lightmap = Array(rows).fill().map(() => Array(cols).fill(0));
    lights = [];
    for (var r = 0; r < rows; r++) {
        grid.push([]);
        for (var c = 0; c < cols; c++) {
            var cell = new Cell(r, c);
            grid[r].push(cell);
            unvisited.push(cell);
        }
    }
    updateSize(true);

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

    // Draw the grid to an offscreen texture.
    mazeCtx.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);
    mazeCtx.drawImage(groundOverlay, 0, 0, cellSize * grid.length, cellSize * grid[0].length);
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            if (r === 0 && c === 0) { continue; }
            grid[r][c].show(mazeCtx);
        }
    }
    grid[0][0].show(mazeCtx);

    // Initialize player at the top-left corner
    player = new Player(0, 0);
}

function renderLight(x, y, radius) {
    g.save()
    g.globalCompositeOperation = "lighter";
    var rnd = 0.05 * Math.sin((10 * Date.now()) / 1000)
    radius = radius * (1 + rnd)
    var radialGradient = g.createRadialGradient(x, y, 0, x, y, radius)
    radialGradient.addColorStop(0.0, "#BB9")
    radialGradient.addColorStop(0.2 + rnd, "#AA8")
    radialGradient.addColorStop(0.7 + rnd, "#330")
    radialGradient.addColorStop(0.9, "#110")
    radialGradient.addColorStop(1, "#000")
    g.fillStyle = radialGradient
    g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
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

    this.reset = function (sprite) {
        this.r = 0;
        this.c = 0;
        this.visualR = 0;
        this.visualC = 0;
        this.currentSprite = sprite;
    }
    this.move = function (dir) {
        if (dir === "up" && this.r > 0 && !grid[this.r][this.c].wallUp) {
            this.r--;
            if (gameState === "playing_neuro") {
                this.currentSprite = neuroBack;
            } else if (gameState === "playing_evil") {
                this.currentSprite = evilBack;
            }
        } else if (dir === "right" && this.c < cols - 1 && !grid[this.r][this.c].wallRight) {
            this.c++;
            if (gameState === "playing_neuro") {
                this.currentSprite = neuroRight;
            } else if (gameState === "playing_evil") {
                this.currentSprite = evilRight;
            }
        } else if (dir === "down" && this.r >= 0 && !grid[this.r][this.c].wallDown) {
            this.r++;
            if (gameState === "playing_neuro") {
                this.currentSprite = neuroFront;
            } else if (gameState === "playing_evil") {
                this.currentSprite = evilFront
            }
        } else if (dir === "left" && this.c > 0 && !grid[this.r][this.c].wallLeft) {
            this.c--;
            if (gameState === "playing_neuro") {
                this.currentSprite = neuroLeft;
            } else if (gameState === "playing_evil") {
                this.currentSprite = evilLeft;
            }
        }

        if (this.r === rows - 1 && this.c === cols - 1 && gameState === "playing_neuro") {
            gameState = "winning_neuro";
            winning_start_seconds = new Date().getTime() / 1000;
        } else if (this.r === rows - 1 && this.c === cols - 1 && gameState === "playing_evil") {
            gameState = "winning_evil";
            winning_start_seconds = new Date().getTime() / 1000;
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

    this.show = function (ctx) {
        var x = this.c * cellSize;
        var y = this.r * cellSize;

        // var isNearPlayer = Math.abs(this.r - player.r) <= 1 && Math.abs(this.c - player.c) <= 1;
        // var isLit = isNearPlayer || lightmap[this.r][this.c] >= 1;
        var isLit = true;
        var isStart = this.r === 0 && this.c === 0;
        var isEnd = this.r === rows - 1 && this.c === cols - 1;
        if (isLit) {
            if (this.wallLeft && !isStart) {
                ctx.drawImage(wall, x - cellSize / 2, y, cellSize * 1.2, cellSize * 1.2);
            }
            if (this.wallUp && !isStart) {
                ctx.save();
                ctx.translate(x + cellSize / 2, y + cellSize / 2);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(wall, -cellSize, -cellSize + cellSize / 2 - 10, cellSize * 1.2, cellSize * 1.2);
                ctx.restore();
            }

            if (this.wallRight && this.c == cols - 1 && !isEnd) {
                ctx.drawImage(wall, x + cellSize / 2, y, cellSize * 1.2, cellSize * 1.2);
            }

            if (this.wallDown && this.r == rows - 1 && !isEnd) {
                ctx.save();
                ctx.translate(x + cellSize / 2, y + cellSize / 2);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(wall, -cellSize + cellSize, -cellSize + cellSize / 2 - 10, cellSize * 1.2, cellSize * 1.2);
                ctx.restore();
            }

            if (isStart) {
                ctx.drawImage(startSquare, x, y, cellSize * 1.2, cellSize * 1.2);
            }
            if (isEnd) {
                ctx.drawImage(endSquare, x + 4, y, cellSize * 1.2, cellSize * 1.2);
            }

            // wall.strokeStyle = "yellow"; // Set the wall color to black
            // ctx.lineWidth = 8; // Increase the line width to make the walls thicker
            // if (this.wallUp) {
            //     ctx.beginPath();
            //     ctx.moveTo(x, y);
            //     ctx.lineTo(x + cellSize, y);
            //     ctx.stroke();
            // }
            // if (this.wallRight) {
            //     ctx.beginPath();
            //     ctx.moveTo(x + cellSize, y);
            //     ctx.lineTo(x + cellSize, y + cellSize);
            //     ctx.stroke();
            // }
            // if (this.wallDown) {
            //     ctx.beginPath();
            //     ctx.moveTo(x + cellSize, y + cellSize);
            //     ctx.lineTo(x, y + cellSize);
            //     ctx.stroke();
            // }
            // if (this.wallLeft) {
            //     ctx.beginPath();
            //     ctx.moveTo(x, y + cellSize);
            //     ctx.lineTo(x, y);
            //     ctx.stroke();
            // }
        } else {
            ctx.fillStyle = "black";
            ctx.fillRect(x, y, cellSize, cellSize);
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


function renderOpeningNeuro() {
    canvas_container.style = "background-color: pink";
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "pink";
    g.fillRect(0, 0, canvas.width, canvas.height);
    let img = neuro_screens[neuro_opening_counter];
    let aspect = img.height / img.width;
    let w = Math.min(canvas.width, img.width);
    g.drawImage(img, 0, 0, w, w * aspect);

    g.drawImage(press_enter, 0, 20 + 10 * Math.sin(new Date().getTime() / 150), w, w * aspect);
}

function renderOpeningEvil() {
    canvas_container.style = "background-color: black";
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "black";
    g.fillRect(0, 0, canvas.width, canvas.height);
    let img = evil_screens[evil_opening_counter];
    let aspect = img.height / img.width;
    let w = Math.min(canvas.width, img.width);
    g.drawImage(img, 0, 0, w, w * aspect);

    g.drawImage(press_enter, 0, 20 + 10 * Math.sin(new Date().getTime() / 150), w, w * aspect);
}

function renderWin() {
    canvas_container.style = "background-color: pink";
    if (win_screen_counter != win_screens.length - 1) {
        g.clearRect(0, 0, canvas.width, canvas.height);
        g.fillStyle = "pink";
        g.fillRect(0, 0, canvas.width, canvas.height);
        let img = win_screens[win_screen_counter];
        let aspect = img.height / img.width;
        let w = Math.min(canvas.width, img.width);
        g.drawImage(img, 0, 0, w, w * aspect);

        g.drawImage(press_enter, 0, 20 + 10 * Math.sin(new Date().getTime() / 150), w, w * aspect);
    } else {
        g.clearRect(0, 0, canvas.width, canvas.height);
        g.fillStyle = "pink";
        g.fillRect(0, 0, canvas.width, canvas.height);

        let img = win_screens[win_screen_counter];
        let aspect = img.width / img.height;
        let h = Math.min(canvas.height, img.height);
        g.drawImage(img, 0, 0, aspect * h, h);
    }
}

function renderLose() {
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "black";
    g.fillRect(0, 0, canvas.width, canvas.height);


    if (canvas.width < canvas.height) {
        let img = lose_screens[lose_screen_counter];
        let aspect = img.height / img.width;
        let w = Math.min(canvas.width, img.width);
        g.drawImage(img, 0, 0, w, w * aspect);
    } else {
        let img = lose_screens[lose_screen_counter];
        let aspect = img.width / img.height;
        let h = Math.min(canvas.height, img.height);
        g.drawImage(img, 0, 0, aspect * h, h);
    }
}

function drawGameNeuro() {
    canvas_container.style = "background-color: pink";
    // Clear the canvas
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "pink";
    g.fillRect(0, 0, canvas.width, canvas.height);

    g.fillStyle = 'rgb(162, 140, 124)';
    g.fillRect(0, 0, cellSize * grid.length, cellSize * grid[0].length);

    g.drawImage(groundOverlay, 0, 0, cellSize * grid.length, cellSize * grid[0].length);

    // Draw the maze
    g.drawImage(mazeCanvas, 0, 0, canvas.width, canvas.height);

    // Draw the player, objects, and UI
    lights.forEach(light => light.drawCandle());
    player.show();

    // Display the number of lights remaining
    g.fillStyle = "black";
    g.font = "32px Arial";
    g.textBaseline="top";
    g.fillText("Press [space] to leave a candle.", 200, canvas.height - 70);
    g.fillText("Candles remaining: " + player.lights, 200, canvas.height - 36);
}

function drawGameEvil() {
    canvas_container.style = "background-color: black";
    // Clear the canvas
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "black";
    g.fillRect(0, 0, canvas.width, canvas.height);

    // Render all lights
    player.showLight();
    lights.forEach(light => light.drawLight());
    renderLight(cellSize / 2, cellSize / 2, 2 * cellSize / 2);
    renderLight(cellSize * (cols - 1) + cellSize / 2, cellSize * (rows - 1) + cellSize / 2, 2 * cellSize / 2);

    // Draw the maze
    g.save();
    g.globalCompositeOperation = "multiply";
    g.drawImage(mazeCanvas, 0, 0, canvas.width, canvas.height);
    g.restore();

    // Draw the player, objects, and UI
    lights.forEach(light => light.drawCandle());
    player.show();

    // Timer
    if (gameState !== "winning_evil") {
        let now_seconds = new Date().getTime() / 1000;
        let time_remaining = Math.max(0, timer_length_seconds - (now_seconds - timer_start_seconds));
        let seconds_remaining = Math.floor(time_remaining);
        let ms_remaining = Math.floor((time_remaining - seconds_remaining) * 100.0);
        g.font = '68px Courier New';
        g.fillStyle = 'orangered';
        g.textBaseline = 'top';
        g.fillText(`${seconds_remaining}:${ms_remaining}`, canvas.width - 220, 0);
    }
}

function updateSize(force = false) {
    if (!force && canvas.width === WIDTH && canvas.height === HEIGHT) {
        return;
    }
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    mazeWidth = canvas.width - 100;
    mazeHeight = canvas.height - 100;
    cellSize = Math.min(Math.ceil(mazeWidth / cols), Math.ceil(mazeHeight / rows));

    mazeCanvas.width = canvas.width;
    mazeCanvas.height = canvas.height;
    mazeCtx.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);
    if (grid.length === 0) {
        return;
    }
    mazeCtx.drawImage(groundOverlay, 0, 0, cellSize * grid.length, cellSize * grid[0].length);

    // Draw the grid to an offscreen texture.
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            if (r === 0 && c === 0) { continue; }
            grid[r][c].show(mazeCtx);
        }
    }
    grid[0][0].show(mazeCtx);
}

winning_start_seconds = 0;
winning_delay_seconds = 0.7;

function gameLoop() {
    updateSize();
    if (gameState === "playing_neuro" || gameState === "winning_neuro") {
        drawGameNeuro();
    } else if (gameState === "opening_neuro") {
        renderOpeningNeuro();
    } else if (gameState === "opening_evil") {
        renderOpeningEvil();
    } else if (gameState === "playing_evil" || gameState === "winning_evil") {
        drawGameEvil();
        let now_seconds = new Date().getTime() / 1000;
        let time_remaining = timer_length_seconds - (now_seconds - timer_start_seconds);
        if (time_remaining <= 0) {
            gameState = "lose";
            show_lose_image();
            pauseBgm();
            vineboom();
        }
    } else if (gameState === "win") {
        renderWin();
    } else if (gameState === "lose") {
        renderLose();
    }

    if (gameState === "winning_neuro") {
        let now_seconds = new Date().getTime() / 1000;
        if (now_seconds - winning_start_seconds >= winning_delay_seconds) {
            gameState = "opening_evil";
        }
    } else if (gameState === "winning_evil") {
        let now_seconds = new Date().getTime() / 1000;
        if (now_seconds - winning_start_seconds >= winning_delay_seconds) {
            gameState = "win";
            pauseBgm();
        }
    }
    requestAnimationFrame(gameLoop);
}

var neuro_screens = [neuro_opening_1, neuro_opening_2, neuro_opening_3, neuro_opening_4, neuro_opening_5];
var neuro_opening_counter = 0;

var evil_screens = [evil_opening_1];
var evil_opening_counter = 0;

var win_screens = [win_screen_1, win_screen_2];
var win_screen_counter = 0;

var lose_screens = [lose_1];
var lose_screen_counter = 0;

function reset_screens() {
    neuro_opening_counter = 0;
    evil_opening_counter = 0;
    win_screen_counter = 0;
    lose_screen_counter = 0;
}
// Listen for key presses to start the game
window.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        if (gameState === "opening_neuro") {
            neuro_opening_counter++;
            if (neuro_opening_counter >= neuro_screens.length) {
                setup();
            }
        } else if (gameState === "opening_evil") {
            evil_opening_counter++;
            if (evil_opening_counter >= evil_screens.length) {
                gameState = "playing_evil";
                player.reset(evilFront);
                player.lights = 0;
                timer_start_seconds = new Date().getTime() / 1000;
            }
        } else if (gameState === "win") {
            win_screen_counter++;
            if (win_screen_counter >= win_screens.length - 1) {
                show_win_image();
            }
            if (win_screen_counter >= win_screens.length) {
                reset_screens();
                hide_win_image();
                gameState = "opening_neuro";
                rows += 2;
                cols += 2;
                setup();
            }
        }
        else if (gameState === "lose") {
            lose_screen_counter++;
            if (lose_screen_counter >= lose_screens.length) {
                reset_screens();
                hide_lose_image();
                gameState = "opening_neuro";
                playBgm();
            }
        }
    }

    if (gameState === "playing_neuro" || gameState === "playing_evil" && player !== undefined) {
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
    }
});

var click_initiated = false;
// Listen for user interaction to start background music
window.addEventListener("click", function() {
    click_initiated = true;
    if (!bgm_ever_started && gameState == "opening_neuro") {
        playBgm();
    }
});

window.addEventListener("keydown", function() {
    click_initiated = true;
    if (!bgm_ever_started && gameState == "opening_neuro") {
        playBgm();
    }
});

addEventListener("resize", (event) => updateSize());
addEventListener("fullscreenchange", (event) => updateSize());

window.addEventListener("keydown", function(e) {
    if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
        e.preventDefault();
    }
}, false);

// Start the game loop
requestAnimationFrame(gameLoop);
