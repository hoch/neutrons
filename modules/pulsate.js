export class Pulsate {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.graphics = this.canvas.getContext("2d");
        this.physics = new Physics();
        this.initEvents();
    }

    get domElement() {
        return this.canvas;
    }

    update() {
        const canvas = this.canvas;
        const graphics = this.graphics;
        const width = canvas.width = canvas.clientWidth;
        const height = canvas.height = canvas.clientHeight;
        graphics.clearRect(0, 0, width, height);
        graphics.save();
        graphics.translate(width * 0.5, height * 0.5);
        graphics.beginPath();
        graphics.lineWidth = 2.0;
        graphics.strokeStyle = "orange";
        const circles = this.physics.circles;
        for (let i = 0; i < circles.length; i++) {
            const circle = circles[i];
            if (0.0 >= circle.radius) {
                continue;
            }
            graphics.moveTo(circle.x + circle.radius, circle.y);
            graphics.arc(circle.x, circle.y, circle.radius, 0.0, 2.0 * Math.PI);
        }
        graphics.stroke();
        graphics.restore();
    }

    initEvents() {
        const canvas = this.canvas;
        canvas.addEventListener("mousedown", event => {
            const rect = canvas.getBoundingClientRect();
            const mx = event.clientX - rect.x - rect.width * 0.5;
            const my = event.clientY - rect.y - rect.height * 0.5;
            this.physics.circles.push(new Circle(mx, my, 0.0, 50.0));
        });
        window.addEventListener("keydown", event => {
            if (event.code === "Space") {
                this.physics.clear();
            }
        });
    }
}

export class Circle {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.radiusVelocity = 100.1;
    }
}

export class Physics {
    constructor() {
        this.circles = [];
        this.collisionSelf = new CollisionSelf();
        this.collisionPair = new CollisionPair();
    }

    clear() {
        this.circles.splice(0, this.circles.length);
    }

    run(time, observer) {
        let remaining = time;
        while (0.0 < remaining) {
            const collision = this.detect(remaining);
            if (null == collision) {
                break;
            }
            if (null != observer) {
                if (collision === this.collisionSelf) {
                    observer(this.collisionSelf);
                }
                else if (collision === this.collisionPair) {
                    observer(this.collisionPair);
                }
            }
            this.integrate(collision.time);
            remaining -= collision.time;
            collision.resolve();
        }
        if (0.0 < remaining) {
            this.integrate(remaining);
        }
        this.collisionSelf.clear();
        this.collisionPair.clear();
    }

    detect(dt) {
        const maxRadius = 2048.0;
        const circles = this.circles;
        let collision = null;
        let time = dt;
        let a, b;
        let i = circles.length, j;
        while (--i > -1) {
            a = circles[i];
            if (a.radius > maxRadius) {
                circles.splice(i, 1);
                continue;
            }
            if (this.collisionSelf.detect(a, time)) {
                collision = this.collisionSelf;
                time = collision.time;
            }
            j = i;
            while (--j > -1) {
                b = circles[j];

                if (this.collisionPair.detect(a, b, time)) {
                    collision = this.collisionPair;
                    time = collision.time;
                }
            }
        }
        return collision;
    }

    integrate(dt) {
        const numCircles = this.circles.length;
        for (let i = 0; i < numCircles; ++i) {
            const circle = this.circles[i];
            circle.radius += circle.radiusVelocity * dt;
        }
    }
}

export class Collision {
    constructor() {
        this.time = NaN;
    }

    resolve() {
        throw new Error("Not implemented");
    }

    clear() {
        throw new Error("Not implemented");
    }
}

export class CollisionPair extends Collision {
    constructor() {
        super();

        this.circleA = null;
        this.circleB = null;
        this.type = 0;
    }

    detect(a, b, max) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dd = Math.sqrt(dx * dx + dy * dy);
        const pr0 = a.radius;
        const pr1 = b.radius;
        const vr0 = a.radiusVelocity;
        const vr1 = b.radiusVelocity;
        const dt0 = (pr1 - pr0) / (vr0 - vr1);
        const dt1 = -(pr1 - pr0 + dd) / (vr1 - vr0);
        const dt2 = (-pr1 + pr0 + dd) / (vr1 - vr0);
        const dt3 = (-pr1 - pr0 + dd) / (vr1 + vr0);
        if (0.0 <= dt0 && dt0 < max && 0.0 === dd) {
            if (0.0 <= vr0 - vr1) {
                this.time = dt0;
                this.type = 0;
                this.circleA = a;
                this.circleB = b;
                return true;
            }
        }
        else if (0.0 <= dt1 && dt1 < max) {
            if (0.0 <= vr1 - vr0) {
                this.time = dt1;
                this.type = 0;
                this.circleA = a;
                this.circleB = b;
                return true;
            }
        }
        else if (0.0 <= dt2 && dt2 < max) {
            if (0.0 <= vr0 - vr1) {
                this.time = dt2;
                this.type = 0;
                this.circleA = a;
                this.circleB = b;
                return true;
            }
        }
        else if (0.0 <= dt3 && dt3 < max) {
            if (0.0 <= vr1 + vr0) {
                this.time = dt3;
                this.type = 1;
                this.circleA = a;
                this.circleB = b;
                return true;
            }
        }
        return false;
    }

    resolve() {
        if (null === this.circleA || null === this.circleB) {
            throw new Error("cannot resolve. circle is null.");
        }
        const av = this.circleA.radiusVelocity;
        const bv = this.circleB.radiusVelocity;
        if (0 === this.type) {
            this.circleA.radiusVelocity = bv;
            this.circleB.radiusVelocity = av;
        }
        else if (1 === this.type) {
            this.circleA.radiusVelocity = -bv;
            this.circleB.radiusVelocity = -av;
        }
    }

    clear() {
        this.circleA = null;
        this.circleB = null;
    }
}

export class CollisionSelf extends Collision {
    constructor() {
        super();

        this.circle = null;
    }

    detect(circle, max) {
        if (0.5 > circle.radiusVelocity) {
            const delta = (0.5 - circle.radius) / circle.radiusVelocity;
            if (0.0 <= delta && delta < max) {
                this.time = delta;
                this.circle = circle;
                return true;
            }
        }
        return false;
    }

    resolve() {
        if (null === this.circle) {
            throw new Error("cannot resolve. circle is null.");
        }
        const radiusVelocity = this.circle.radiusVelocity;
        this.circle.radiusVelocity = -radiusVelocity;
    }

    clear() {
        this.circle = null;
    }
}