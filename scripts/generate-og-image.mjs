import { createCanvas } from "@napi-rs/canvas";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const width = 1200;
const height = 630;

const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// Background gradient
const gradient = ctx.createLinearGradient(0, 0, width, height);
gradient.addColorStop(0, "#0a2239");
gradient.addColorStop(1, "#09131f");
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

// Accent shapes
ctx.fillStyle = "rgba(135, 206, 250, 0.12)";
ctx.beginPath();
ctx.ellipse(260, 520, 260, 180, Math.PI / 6, 0, Math.PI * 2);
ctx.fill();
ctx.beginPath();
ctx.ellipse(980, 140, 240, 160, -Math.PI / 8, 0, Math.PI * 2);
ctx.fill();

// Title text
ctx.fillStyle = "#FFFFFF";
ctx.font = "bold 84px 'Segoe UI', 'Helvetica Neue', sans-serif";
ctx.textBaseline = "top";
ctx.fillText("Intel App Pilot", 80, 160);

// Subtitle
ctx.font = "normal 38px 'Segoe UI', 'Helvetica Neue', sans-serif";
ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
ctx.fillText("AI-assisted study companion", 80, 260);
ctx.fillText("Quizzes · Flashcards · Summaries · Chat", 80, 320);

// Divider line
ctx.strokeStyle = "rgba(135, 206, 250, 0.4)";
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(80, 380);
ctx.lineTo(580, 380);
ctx.stroke();

// Callout badge
ctx.fillStyle = "rgba(135, 206, 250, 0.14)";
ctx.roundRect(80, 420, 360, 80, 18);
ctx.fill();
ctx.fillStyle = "rgba(135, 206, 250, 0.9)";
ctx.font = "600 34px 'Segoe UI', 'Helvetica Neue', sans-serif";
ctx.fillText("Powered by Google Gemini", 112, 444);

// Footer text
ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
ctx.font = "28px 'Segoe UI', 'Helvetica Neue', sans-serif";
ctx.fillText("intelapppilot.com", 80, 520);
ctx.fillText("Fuel smarter study sessions with AI", 80, 566);

// Ensure public directory exists and write file
const outputDir = resolve("public");
mkdirSync(outputDir, { recursive: true });

const outputPath = resolve(outputDir, "opengraph-image.png");
const buffer = canvas.toBuffer("image/png");
writeFileSync(outputPath, buffer);

console.log(`Generated OG image at ${outputPath}`);
