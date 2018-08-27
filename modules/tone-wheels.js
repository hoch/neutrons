import {mouse} from "./standard.js";

export class Particle {
    constructor(note, x, y) {
        this.note = note;
        this.x = x;
        this.y = y;

        this.lastTriggerTime = Number.NEGATIVE_INFINITY;
    }
}

export class Wheel {
    constructor(radius, numSegments, speed, octave, x, y) {
        this.radius = radius;
        this.numSegments = numSegments;
        this.speed = speed;
        this.octave = octave;
        this.x = x;
        this.y = y;
    }

    process(particles, callback, from, to) {
        const p0 = (this.speed * from) % 1.0;
        const p1 = (this.speed * to) % 1.0;
        let step = 1.0 / this.numSegments;
        let rel;
        let i = particles.length;
        while (--i > -1) {
            const particle = particles[i];
            const dx = particle.x - this.x;
            const dy = particle.y - this.y;
            if (dx * dx + dy * dy > this.radius * this.radius) {
                continue;
            }
            const abs = 1.0 + (Math.atan2(dy, dx) + Math.PI * 0.5) / (Math.PI * 2.0);
            let j = this.numSegments;
            while (--j > -1) {
                rel = j * step + abs;
                rel = rel - Math.floor(rel);
                if (p1 > p0) {
                    if (rel >= p0 && rel < p1) {
                        callback(this, particle, rel - p0, dx / this.radius);
                    }
                }
                else {
                    if (rel >= p0 && rel < 1.0) {
                        callback(this, particle, rel - p0, dx / this.radius);
                    }
                    else if (rel >= 0.0 && rel < p1) {
                        callback(this, particle, 1.0 - p0 + rel, dx / this.radius);
                    }
                }
            }
        }
    }
}

export class ToneWheels {
    constructor() {
        this.wheels = [];
        this.particles = [];

        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.graphics = this.canvas.getContext("2d");
        this.initEvents();
    }

    createWheel(radius, numSegments, speed, octave, x, y) {
        this.wheels.push(new Wheel(radius, numSegments, speed, octave, x, y));
    }

    createParticle(note, x, y) {
        this.particles.push(new Particle(note, x, y));
    }

    process(callback, from, to) {
        for (let wheel of this.wheels) {
            wheel.process(this.particles, callback, from, to);
        }
    }

    get domElement() {
        return this.canvas;
    }

    render(currentTime, musicalTime) {
        const canvas = this.canvas;
        const graphics = this.graphics;
        const width = canvas.width = canvas.clientWidth;
        const height = canvas.height = canvas.clientHeight;
        graphics.clearRect(0, 0, width, height);
        graphics.save();
        graphics.translate(width * 0.5, height * 0.5);
        for (let wheel of this.wheels) {
            const x = wheel.x;
            const y = wheel.y;
            graphics.beginPath();
            graphics.fillStyle = "#AAA";
            graphics.arc(x, wheel.y, 3.0, 0.0, Math.PI * 2.0, false);
            graphics.fill();
            graphics.beginPath();
            graphics.strokeStyle = "#999";
            const position = musicalTime * wheel.speed * Math.PI * 2.0;
            const r = wheel.radius;
            const step = (Math.PI * 2) / wheel.numSegments;
            for (let i = 0; i < wheel.numSegments; ++i) {
                const angle = i * step + position;
                const sn = Math.sin(angle);
                const cs = Math.cos(angle);
                graphics.moveTo(x + sn * 8, y + cs * -8);
                graphics.lineTo(x + sn * r, y + cs * -r);
            }
            graphics.stroke();
        }
        for (let particle of this.particles) {
            const playing = (currentTime - particle.lastTriggerTime < 0.050);
            graphics.beginPath();
            graphics.fillStyle = playing ? "#FFF" : "#888";
            graphics.arc(particle.x, particle.y, 5.0, 0.0, Math.PI * 2.0, false);
            graphics.fill();
            if (playing) {
                graphics.beginPath();
                graphics.strokeStyle = "rgba(255,255,255,0.5)";
                graphics.arc(particle.x, particle.y, 9.0, 0.0, Math.PI * 2.0, false);
                graphics.stroke();
            }
        }
        graphics.restore();
    }

    initEvents() {
        const canvas = this.canvas;
        let target = null;
        let tx, ty, mx, my;
        mouse(canvas, event => {
            const rect = canvas.getBoundingClientRect();
            mx = event.clientX - rect.x - rect.width * 0.5;
            my = event.clientY - rect.y - rect.height * 0.5;
            target = null;
            let min = 8;
            const test = (objects) => {
                for (let object of objects) {
                    const dx = object.x - mx;
                    const dy = object.y - my;
                    const dd = Math.sqrt(dx * dx + dy * dy);
                    if (min > dd) {
                        min = dd;
                        tx = object.x;
                        ty = object.y;
                        target = object;
                    }
                }
            };
            test(this.wheels);
            test(this.particles);
        }, event => {
            if (null === target) {
                return;
            }
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.x - rect.width * 0.5;
            const y = event.clientY - rect.y - rect.height * 0.5;
            target.x = tx + (x - mx);
            target.y = ty + (y - my);
        }, ignore => {
            target = null;
        });
    }
}