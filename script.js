const canvas = document.getElementById("billiardsCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 400;

const table = {
  width: canvas.width,
  height: canvas.height,
  friction: 0.985
};

const BALL_RADIUS = 10;
const POCKET_RADIUS = 18;
const balls = [];
let gameActive = true;

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
    ctx.strokeStyle = "black";
    ctx.stroke();
  }

  update() {
    if (this.potted) return;
    this.x += this.vx;
    this.y += this.vy;

    this.vx *= table.friction;
    this.vy *= table.friction;

    if (Math.abs(this.vx) < 0.01) this.vx = 0;
    if (Math.abs(this.vy) < 0.01) this.vy = 0;

    if (this.x < BALL_RADIUS || this.x > table.width - BALL_RADIUS) this.vx *= -1;
    if (this.y < BALL_RADIUS || this.y > table.height - BALL_RADIUS) this.vy *= -1;

    for (let px of [0, table.width]) {
      for (let py of [0, table.height]) {
        if (Math.hypot(this.x - px, this.y - py) < POCKET_RADIUS) {
          this.potted = true;
          this.vx = this.vy = 0;
        }
      }
    }
  }
}

function createBalls() {
  balls.push(new Ball(150, 200, "white", true)); // cue ball
  const colors = ["yellow", "blue", "red", "purple", "orange", "green", "maroon"];
  let startX = 600;
  let startY = 200;
  let offset = 0;

  for (let i = 0; i < colors.length; i++) {
    let row = Math.floor(i / 2);
    let x = startX + row * BALL_RADIUS * 2;
    let y = startY + (i % 2 === 0 ? -offset : offset);
    offset += BALL_RADIUS;
    balls.push(new Ball(x, y, colors[i]));
  }
}

let aiming = false;
let aimX = 0;
let aimY = 0;
let mouseDown = false;

canvas.addEventListener("mousedown", (e) => {
  if (!gameActive) return;
  const rect = canvas.getBoundingClientRect();
  aimX = e.clientX - rect.left;
  aimY = e.clientY - rect.top;
  aiming = true;
  mouseDown = true;
});

canvas.addEventListener("mousemove", (e) => {
  if (!mouseDown) return;
  const rect = canvas.getBoundingClientRect();
  aimX = e.clientX - rect.left;
  aimY = e.clientY - rect.top;
});

canvas.addEventListener("mouseup", (e) => {
  if (!aiming) return;
  const cueBall = balls.find(b => b.isCue);
  if (cueBall.potted) return;

  const dx = cueBall.x - aimX;
  const dy = cueBall.y - aimY;
  cueBall.vx = dx * 0.1;
  cueBall.vy = dy * 0.1;

  aiming = false;
  mouseDown = false;
});

function drawCueStick() {
  if (!aiming) return;
  const cueBall = balls.find(b => b.isCue);
  if (cueBall.potted) return;

  const dx = aimX - cueBall.x;
  const dy = aimY - cueBall.y;
  const angle = Math.atan2(dy, dx);
  const dist = Math.min(100, Math.hypot(dx, dy));

  ctx.beginPath();
  ctx.moveTo(cueBall.x - Math.cos(angle) * (dist + 20), cueBall.y - Math.sin(angle) * (dist + 20));
  ctx.lineTo(cueBall.x, cueBall.y);
  ctx.strokeStyle = "#deb887";
  ctx.lineWidth = 4;
  ctx.stroke();
}

function checkCollisions() {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      let b1 = balls[i];
      let b2 = balls[j];
      if (b1.potted || b2.potted) continue;

      let dx = b1.x - b2.x;
      let dy = b1.y - b2.y;
      let dist = Math.hypot(dx, dy);
      if (dist < BALL_RADIUS * 2) {
        let angle = Math.atan2(dy, dx);
        let force = ((b1.vx - b2.vx) * Math.cos(angle) + (b1.vy - b2.vy) * Math.sin(angle));
        b1.vx -= force * Math.cos(angle);
        b1.vy -= force * Math.sin(angle);
        b2.vx += force * Math.cos(angle);
        b2.vy += force * Math.sin(angle);

        let overlap = BALL_RADIUS * 2 - dist;
        let moveX = (overlap / 2) * Math.cos(angle);
        let moveY = (overlap / 2) * Math.sin(angle);
        b1.x += moveX;
        b1.y += moveY;
        b2.x -= moveX;
        b2.y -= moveY;
      }
    }
  }
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#006400";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw pockets
  ctx.fillStyle = "black";
  [0, canvas.width].forEach((px) => {
    [0, canvas.height].forEach((py) => {
      ctx.beginPath();
      ctx.arc(px, py, POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  for (let ball of balls) {
    ball.update();
    ball.draw();
  }

  checkCollisions();
  drawCueStick();

  requestAnimationFrame(update);
}

createBalls();
update();
