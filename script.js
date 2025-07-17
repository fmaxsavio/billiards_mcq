const canvas = document.getElementById("billiardsCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 400;

const BALL_RADIUS = 10;
const POCKET_RADIUS = 18;

const table = {
  width: canvas.width,
  height: canvas.height,
  friction: 0.98
};

let balls = [];
let aiming = false;
let aimStart = { x: 0, y: 0 };
let aimEnd = { x: 0, y: 0 };

class Ball {
  constructor(x, y, color, isCue = false) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.isCue = isCue;
    this.potted = false;
  }

  draw() {
    if (this.potted) return;
    ctx.beginPath();
    ctx.arc(this.x, this.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.stroke();
  }

  update() {
    if (this.potted) return;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= table.friction;
    this.vy *= table.friction;

    // Wall collisions
    if (this.x <= BALL_RADIUS || this.x >= table.width - BALL_RADIUS) this.vx *= -1;
    if (this.y <= BALL_RADIUS || this.y >= table.height - BALL_RADIUS) this.vy *= -1;

    // Pocket detection
    const pocketCoords = [
      { x: 0, y: 0 },
      { x: table.width, y: 0 },
      { x: 0, y: table.height },
      { x: table.width, y: table.height }
    ];
    for (let p of pocketCoords) {
      if (Math.hypot(this.x - p.x, this.y - p.y) < POCKET_RADIUS) {
        this.potted = true;
        this.vx = 0;
        this.vy = 0;
      }
    }
  }
}

function createBalls() {
  balls = [];
  balls.push(new Ball(150, 200, "white", true)); // cue ball
  const colors = ["yellow", "red", "blue", "green", "purple"];
  for (let i = 0; i < colors.length; i++) {
    balls.push(new Ball(600 + (i * 22), 200, colors[i]));
  }
}

function drawAimLine() {
  if (!aiming) return;

  // Dotted line
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(aimStart.x, aimStart.y);
  ctx.lineTo(aimEnd.x, aimEnd.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw cue stick behind cue ball
  const cueBall = balls.find(b => b.isCue);
  if (cueBall && !cueBall.potted) {
    const dx = cueBall.x - aimEnd.x;
    const dy = cueBall.y - aimEnd.y;
    const angle = Math.atan2(dy, dx);
    const stickLength = 80;
    const stickBackX = cueBall.x + Math.cos(angle) * stickLength;
    const stickBackY = cueBall.y + Math.sin(angle) * stickLength;

    ctx.strokeStyle = "#c49a6c"; // wood color
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(stickBackX, stickBackY);
    ctx.lineTo(cueBall.x, cueBall.y);
    ctx.stroke();
  }

  // Draw reflection path (simple single bounce from one wall)
  const dx = aimEnd.x - cueBall.x;
  const dy = aimEnd.y - cueBall.y;
  const reflectionLength = 200;

  let rx = cueBall.x + dx;
  let ry = cueBall.y + dy;

  if (rx <= 0 || rx >= canvas.width) dx *= -1;
  if (ry <= 0 || ry >= canvas.height) dy *= -1;

  const reflectX = cueBall.x + dx * 2;
  const reflectY = cueBall.y + dy * 2;

  ctx.strokeStyle = "yellow";
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(cueBall.x, cueBall.y);
  ctx.lineTo(reflectX, reflectY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTable() {
  ctx.fillStyle = "#064f1c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Pockets
  ctx.fillStyle = "#000";
  for (let p of [
    [0, 0], [canvas.width, 0], [0, canvas.height], [canvas.width, canvas.height]
  ]) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], POCKET_RADIUS, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTable();

  for (let ball of balls) {
    ball.update();
    ball.draw();
  }

  checkCollisions();
  drawAimLine();

  requestAnimationFrame(update);
}

function checkCollisions() {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const b1 = balls[i];
      const b2 = balls[j];
      if (b1.potted || b2.potted) continue;

      const dx = b1.x - b2.x;
      const dy = b1.y - b2.y;
      const dist = Math.hypot(dx, dy);
      if (dist < BALL_RADIUS * 2) {
        const angle = Math.atan2(dy, dx);
        const totalVel = (b1.vx - b2.vx) * Math.cos(angle) + (b1.vy - b2.vy) * Math.sin(angle);

        b1.vx -= totalVel * Math.cos(angle);
        b1.vy -= totalVel * Math.sin(angle);
        b2.vx += totalVel * Math.cos(angle);
        b2.vy += totalVel * Math.sin(angle);

        // Separate balls
        const overlap = BALL_RADIUS * 2 - dist;
        b1.x += (overlap / 2) * Math.cos(angle);
        b1.y += (overlap / 2) * Math.sin(angle);
        b2.x -= (overlap / 2) * Math.cos(angle);
        b2.y -= (overlap / 2) * Math.sin(angle);
      }
    }
  }
}

canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  aimStart = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
  aimEnd = { ...aimStart };
  aiming = true;
});

canvas.addEventListener("mousemove", (e) => {
  if (!aiming) return;
  const rect = canvas.getBoundingClientRect();
  aimEnd = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
});

canvas.addEventListener("mouseup", (e) => {
  if (!aiming) return;
  const cueBall = balls.find(b => b.isCue && !b.potted);
  if (!cueBall) return;

  const dx = cueBall.x - aimEnd.x;
  const dy = cueBall.y - aimEnd.y;
  cueBall.vx = dx * 0.1;
  cueBall.vy = dy * 0.1;

  aiming = false;
});

createBalls();
update();
